"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

import type { SpotListItem } from "./spot-types";

const DEFAULT_CENTER = { lat: 35.681236, lng: 139.767125 }; // 東京駅付近

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type SpotMapProps = {
  spots: SpotListItem[];
  selectedId: string | null;
  onMarkerSelect: (id: string) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
};

type MapLayer = "modern" | "meiji";
type RegionMode = "auto" | "manual";

// 今昔マップ (ktgis.net) の地域データセット（明治期 1:25,000 図）
// period は現在利用可能なタイルパス（多くは "00"、一部は "2man" でも提供）
const HISTORICAL_MAP_REGIONS = [
  { id: "sapporo", name: "札幌", period: "00", bounds: { west: 140.8, south: 42.6, east: 141.8, north: 43.5 } },
  { id: "hakodate", name: "函館", period: "00", bounds: { west: 140.1, south: 41.2, east: 141.3, north: 42.2 } },
  { id: "aomori", name: "青森", period: "00", bounds: { west: 140.1, south: 40.3, east: 141.3, north: 41.3 } },
  { id: "sendai", name: "仙台", period: "00", bounds: { west: 140.0, south: 37.7, east: 141.6, north: 38.9 } },
  { id: "tokyo50", name: "首都圏", period: "00", bounds: { west: 138.7, south: 34.9, east: 140.9, north: 36.3 } },
  { id: "niigata", name: "新潟", period: "00", bounds: { west: 138.3, south: 37.3, east: 139.7, north: 38.4 } },
  { id: "nagano", name: "長野", period: "00", bounds: { west: 137.4, south: 36.0, east: 139.0, north: 37.3 } },
  { id: "chukyo", name: "中京圏", period: "00", bounds: { west: 136.0, south: 34.5, east: 137.8, north: 36.0 } },
  { id: "keihansin", name: "京阪神圏", period: "00", bounds: { west: 135.0, south: 34.1, east: 136.4, north: 35.3 } },
  { id: "okayama", name: "岡山", period: "00", bounds: { west: 133.3, south: 34.1, east: 134.5, north: 35.1 } },
  { id: "hiroshima", name: "広島", period: "00", bounds: { west: 132.0, south: 33.9, east: 133.5, north: 35.0 } },
  { id: "takamatsu", name: "高松", period: "00", bounds: { west: 133.6, south: 33.9, east: 134.5, north: 34.7 } },
  { id: "matsuyama", name: "松山", period: "00", bounds: { west: 132.1, south: 33.4, east: 133.3, north: 34.3 } },
  { id: "fukuoka", name: "福岡", period: "00", bounds: { west: 130.0, south: 33.0, east: 131.1, north: 34.1 } },
  { id: "kumamoto", name: "熊本", period: "00", bounds: { west: 129.9, south: 32.3, east: 131.2, north: 33.3 } },
  { id: "kagoshima", name: "鹿児島", period: "00", bounds: { west: 129.7, south: 31.0, east: 131.0, north: 32.1 } },
] as const;

type HistoricalRegion = (typeof HISTORICAL_MAP_REGIONS)[number];

function regionCenter(region: HistoricalRegion) {
  return {
    lat: (region.bounds.north + region.bounds.south) / 2,
    lng: (region.bounds.east + region.bounds.west) / 2,
  };
}

// 表示位置に応じて最も近い地域データセットを選ぶ
function selectRegionByLocation(lat: number, lng: number): HistoricalRegion {
  const hit = HISTORICAL_MAP_REGIONS.find(
    (r) =>
      lat >= r.bounds.south &&
      lat <= r.bounds.north &&
      lng >= r.bounds.west &&
      lng <= r.bounds.east
  );
  if (hit) return hit;

  // 範囲外の場合は中心点に最も近い地域を採用
  let closest: HistoricalRegion = HISTORICAL_MAP_REGIONS[0];
  let minDist = Number.POSITIVE_INFINITY;
  for (const region of HISTORICAL_MAP_REGIONS) {
    const center = regionCenter(region);
    const dx = center.lng - lng;
    const dy = center.lat - lat;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closest = region;
    }
  }
  return closest;
}

export function SpotMap({
  spots,
  selectedId,
  onMarkerSelect,
  onBoundsChange,
}: SpotMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const loaderInitializedRef = useRef(false);
  const historicalLayerRef = useRef<google.maps.ImageMapType | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const regionUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [currentLayer, setCurrentLayer] = useState<MapLayer>("modern");
  const [selectedRegion, setSelectedRegion] = useState<string>("tokyo50");
  const [regionMode, setRegionMode] = useState<RegionMode>("auto");
  const [opacity, setOpacity] = useState(0.7);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const center = useMemo(() => {
    if (selectedId) {
      const target = spots.find((spot) => spot.id === selectedId);
      if (target) {
        return { lat: target.lat, lng: target.lng };
      }
    }
    if (spots.length > 0) {
      const avgLat =
        spots.reduce((sum, spot) => sum + spot.lat, 0) / spots.length;
      const avgLng =
        spots.reduce((sum, spot) => sum + spot.lng, 0) / spots.length;
      return { lat: avgLat, lng: avgLng };
    }
    return DEFAULT_CENTER;
  }, [selectedId, spots]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      console.log('[SpotMap] initMap called');
      setDebugInfo('地図を初期化中...');

      if (!mapContainerRef.current) {
        console.error('[SpotMap] mapContainerRef is null');
        setDebugInfo('ERROR: 地図コンテナが見つかりません');
        return;
      }

      if (!loaderInitializedRef.current) {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error(
            "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY が設定されていません。.env.local を確認してください。"
          );
          setDebugInfo('ERROR: Google Maps APIキーが未設定');
          return;
        }
        console.log("Setting Google Maps API options with key:", apiKey.substring(0, 10) + "...");
        setDebugInfo('Google Maps APIを読み込み中...');
        setOptions({
          key: apiKey,
        });
        loaderInitializedRef.current = true;
      }

      try {
        setDebugInfo('Google Mapsライブラリをインポート中...');
        const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;
        await importLibrary("marker");

        if (cancelled) return;

        setDebugInfo('地図インスタンスを作成中...');
        mapInstanceRef.current = new Map(mapContainerRef.current, {
          center,
          zoom: 6,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapId: "FOLKLORE_MAP", // AdvancedMarkerElement に必要
        });
        console.log('[SpotMap] Map instance created');
        setDebugInfo('地図を作成しました');

        // 初期位置に応じて地域データセットを設定
        const initialRegion = selectRegionByLocation(center.lat, center.lng);
        setSelectedRegion(initialRegion.id);

      // bounds 変更イベントをリッスン
      mapInstanceRef.current.addListener("bounds_changed", () => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const bounds = map.getBounds();
        if (!bounds) return;

        if (onBoundsChange) {
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();

          onBoundsChange({
            west: sw.lng(),
            south: sw.lat(),
            east: ne.lng(),
            north: ne.lat(),
          });
        }

        // 地図中心から地域データセットを自動選択（手動モード時は変更しない）
        if (regionMode === "auto") {
          const centerLatLng = map.getCenter();
          if (centerLatLng) {
            if (regionUpdateTimerRef.current) {
              clearTimeout(regionUpdateTimerRef.current);
            }
            regionUpdateTimerRef.current = setTimeout(() => {
              const region = selectRegionByLocation(centerLatLng.lat(), centerLatLng.lng());
              setSelectedRegion((prev) => (prev === region.id ? prev : region.id));
            }, 200);
          }
        }
      });

        setDebugInfo('歴史的地形図レイヤーを作成中...');
        // ktgis.net（今昔マップ）の明治期地形図タイルレイヤーを作成
        // TMS形式のタイルを使用（Y座標の変換が必要）
        console.log('[SpotMap] Historical layer setup complete (lazy loading)');
        setDebugInfo('地図の初期化が完了しました（古地図は切り替え時に読み込み）');

        // InfoWindow を初期化
        infoWindowRef.current = new google.maps.InfoWindow();
        console.log('[SpotMap] Map initialization complete');
        setDebugInfo('地図の初期化が完了しました');
      } catch (error) {
        console.error('[SpotMap] Map initialization error:', error);
        setDebugInfo(`ERROR: ${error instanceof Error ? error.message : '地図の初期化に失敗'}`);
      }
    }

    if (!mapInstanceRef.current) {
      void initMap();
    }

    return () => {
      cancelled = true;
    };
  }, [center]);

  // 選択されたスポットに地図をズーム＆InfoWindowを表示（滑らかなアニメーション）
  useEffect(() => {
    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    if (!map || !infoWindow || !selectedId) {
      // 選択解除時はInfoWindowを閉じる
      if (infoWindow && !selectedId) {
        infoWindow.close();
      }
      return;
    }

    const selectedSpot = spots.find((spot) => spot.id === selectedId);
    if (!selectedSpot) return;

    const marker = markersRef.current.get(selectedId);
    if (!marker) return;

    // タイマーIDを保存（クリーンアップ用）
    const timers: NodeJS.Timeout[] = [];
    const intervals: NodeJS.Timeout[] = [];

    // 滑らかなズームアニメーション
    const targetPosition = { lat: selectedSpot.lat, lng: selectedSpot.lng };
    const targetZoom = 14;
    const overviewZoom = 6; // 一度ズームアウトする全体図のズームレベル
    const currentZoom = map.getZoom() || 6;

    // InfoWindowは最後に表示
    const showInfoWindow = () => {
      const content = `
        <div style="padding: 8px; max-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
            ${selectedSpot.title}
          </h3>
          <p style="margin: 0; font-size: 12px; color: #666;">
            ${getIconLabel(selectedSpot.icon_type)}
          </p>
        </div>
      `;
      infoWindow.setContent(content);
      infoWindow.open({
        map,
        anchor: marker,
      });
    };

    // ズームイン処理
    const zoomInToTarget = () => {
      let currentZ = map.getZoom() || overviewZoom;
      const zoomInInterval = setInterval(() => {
        currentZ += 1;
        map.setZoom(currentZ);

        if (currentZ >= targetZoom) {
          clearInterval(zoomInInterval);
          // ズーム完了後にInfoWindowを表示
          const timer = setTimeout(() => {
            showInfoWindow();
          }, 200);
          timers.push(timer);
        }
      }, 150);
      intervals.push(zoomInInterval);
    };

    // 段階的なズームアニメーション
    const animateZoom = () => {
      // ステップ1: 現在位置から全体図にズームアウト（必要な場合のみ）
      if (currentZoom > overviewZoom + 1) {
        let step = 0;
        const zoomOutSteps = Math.ceil((currentZoom - overviewZoom) / 1);
        const zoomOutInterval = setInterval(() => {
          step++;
          const newZoom = currentZoom - step;
          map.setZoom(newZoom);

          if (step >= zoomOutSteps || newZoom <= overviewZoom) {
            clearInterval(zoomOutInterval);
            // ステップ2: 目的地に移動
            const timer1 = setTimeout(() => {
              map.panTo(targetPosition);
              // ステップ3: 目的地でズームイン
              const timer2 = setTimeout(() => {
                zoomInToTarget();
              }, 600);
              timers.push(timer2);
            }, 300);
            timers.push(timer1);
          }
        }, 100);
        intervals.push(zoomOutInterval);
      } else {
        // すでに全体図レベルの場合は直接移動してズームイン
        map.panTo(targetPosition);
        const timer = setTimeout(() => {
          zoomInToTarget();
        }, 600);
        timers.push(timer);
      }
    };

    // アニメーション開始
    animateZoom();

    // クリーンアップ: タイマーとインターバルをすべてクリア
    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [selectedId, spots]);

  // レイヤー切り替えと透明度調整
  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map) {
      console.log('[SpotMap] Map not ready');
      return;
    }

    // 常にクリアしてから追加し直す
    map.overlayMapTypes.clear();

    if (currentLayer === "meiji") {
      const region = HISTORICAL_MAP_REGIONS.find((r) => r.id === selectedRegion) || HISTORICAL_MAP_REGIONS[0];
      console.log('[SpotMap] Creating historical layer for region:', region.name);

      // タイルが表示される最小ズームを確保
      const currentZoom = map.getZoom() ?? 0;
      if (currentZoom < 8) {
        map.setZoom(10);
        setDebugInfo(`${region.name} - 透明度${Math.round(opacity * 100)}% / 表示にはズームインが必要です`);
      }

      // ktgis.net（今昔マップ）のタイルレイヤーを作成
      // TMS形式なのでY座標を変換する必要がある
      const historicalMapType = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) => {
          if (!coord || zoom < 8 || zoom > 16) {
            return "";
          }
          // TMS形式: Y座標を反転
          const tmsY = Math.pow(2, zoom) - 1 - coord.y;
          const url = `https://ktgis.net/kjmapw/kjtilemap/${region.id}/${region.period}/${zoom}/${coord.x}/${tmsY}.png`;
          // デバッグ: 最初の数回だけURLをログ出力
          if (zoom === 10 && coord.x % 50 === 0) {
            console.log('[SpotMap] Tile URL:', url);
          }
          return url;
        },
        tileSize: new google.maps.Size(256, 256),
        opacity: opacity,
        name: `明治期地形図（${region.name}）`,
        maxZoom: 16,
        minZoom: 8,
      });

      map.overlayMapTypes.push(historicalMapType);
      historicalLayerRef.current = historicalMapType;

      const count = map.overlayMapTypes.getLength();
      console.log('[SpotMap] Historical layer added, overlay count:', count);
      setDebugInfo(`${region.name} - 透明度${Math.round(opacity * 100)}% (${regionMode === "auto" ? "自動判定" : "手動選択"})`);
    } else {
      console.log('[SpotMap] Modern map mode, no overlay');
      historicalLayerRef.current = null;
      setDebugInfo(`現代地図モード`);
    }
  }, [currentLayer, opacity, selectedRegion, regionMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 既存マーカーをクリア
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current.clear();

    spots.forEach((spot) => {
      // 絵文字アイコンを含むコンテンツを安全に作成（XSS対策）
      const iconElement = document.createElement("div");
      iconElement.className = "custom-marker";

      // 内部divを作成してスタイル設定
      const iconDiv = document.createElement("div");
      iconDiv.style.fontSize = selectedId === spot.id ? "32px" : "28px";
      iconDiv.style.cursor = "pointer";
      iconDiv.style.transition = "all 0.2s";
      iconDiv.style.filter = selectedId === spot.id
        ? "drop-shadow(0 0 8px rgba(216, 67, 57, 0.6))"
        : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))";
      iconDiv.style.transform = selectedId === spot.id ? "scale(1.2)" : "scale(1)";

      // textContentを使用してXSS対策（HTMLエスケープ不要）
      iconDiv.textContent = getIconEmoji(spot.icon_type);

      iconElement.appendChild(iconDiv);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: spot.lat, lng: spot.lng },
        map,
        title: spot.title,
        content: iconElement,
      });

      marker.addListener("click", () => {
        onMarkerSelect(spot.id);
      });

      markersRef.current.set(spot.id, marker);
    });

    // フィルター適用時（selectedIdがnull）は、すべてのスポットが見えるように地図を調整
    if (!selectedId && spots.length > 0) {
      if (spots.length === 1) {
        // 1つのスポットの場合は、その位置を中心に引いた状態で表示
        const spot = spots[0];
        map.setCenter({ lat: spot.lat, lng: spot.lng });
        setTimeout(() => {
          map.setZoom(8); // 都道府県レベルで表示
        }, 100);
      } else {
        // 複数のスポットの場合は、すべてが見えるようにバウンディングボックスを調整
        const bounds = new google.maps.LatLngBounds();

        spots.forEach((spot) => {
          bounds.extend(new google.maps.LatLng(spot.lat, spot.lng));
        });

        // 適度な余白を持たせてフィット
        map.fitBounds(bounds, {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50,
        });
      }
    }
  }, [spots, selectedId, onMarkerSelect]);

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border-2 border-ai/30 shadow-lg">
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* レイヤー切り替えボタン */}
      <div className="absolute top-4 right-4 flex flex-col gap-3 font-gothic-jp">
        <div className="flex gap-2 bg-washi/95 backdrop-blur rounded-lg shadow-md border-2 border-shu/30 p-1">
          <button
            onClick={() => setCurrentLayer("modern")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              currentLayer === "modern"
                ? "bg-shu text-white shadow-sm"
                : "text-sumi/70 hover:bg-shu/10"
            }`}
          >
            現代地図
          </button>
          <button
            onClick={() => setCurrentLayer("meiji")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              currentLayer === "meiji"
                ? "bg-ai text-white shadow-sm"
                : "text-sumi/70 hover:bg-ai/10"
            }`}
          >
            明治期古地図
          </button>
        </div>

        {/* 透明度スライダー & 地域選択（古地図表示時のみ） */}
        {currentLayer === "meiji" && (
          <div className="bg-washi/95 backdrop-blur rounded-lg shadow-md border-2 border-ai/30 p-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-sumi/80 whitespace-nowrap">
                透明度
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity * 100}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="flex-1 h-2 bg-sumi/20 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-ai
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-md
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-ai
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:shadow-md"
              />
              <span className="text-xs font-medium text-sumi/70 w-12 text-right">
                {Math.round(opacity * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-sumi/80 whitespace-nowrap">
                地域
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setRegionMode("manual");
                  setSelectedRegion(e.target.value);
                }}
                className="flex-1 rounded-md border border-ai/30 bg-white/90 text-sm px-2 py-1 shadow-sm focus:outline-none focus:ring-2 focus:ring-ai/50"
              >
                {HISTORICAL_MAP_REGIONS.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}（{region.period}）
                  </option>
                ))}
              </select>
              <button
                onClick={() => setRegionMode("auto")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  regionMode === "auto" ? "bg-ai text-white" : "bg-sumi/10 text-sumi/80 hover:bg-sumi/20"
                }`}
              >
                自動判定に戻す
              </button>
            </div>
          </div>
        )}
      </div>

      {/* デバッグ情報（一時的） */}
      {debugInfo && (
        <div className="absolute top-20 right-4 bg-yellow-100 border-2 border-yellow-500 px-3 py-2 rounded text-xs font-mono shadow-lg">
          <div className="font-bold mb-1">🔍 デバッグ情報:</div>
          <div>{debugInfo}</div>
        </div>
      )}

      {/* クレジット表記 */}
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded text-xs text-sumi/80 shadow-sm font-gothic-jp border border-sumi/10">
        {currentLayer === "meiji" && (
          <span className="font-medium">国土地理院 2万5千分1地形図（明治後期）</span>
        )}
        {currentLayer === "modern" && (
          <span>© Google Maps</span>
        )}
      </div>

      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="absolute inset-x-0 bottom-0 bg-white/80 p-2 text-center text-xs text-red-500">
          Google Maps API キーが設定されていません。`.env` を確認してください。
        </div>
      )}
    </div>
  );
}

function getIconEmoji(iconType: SpotListItem["icon_type"]) {
  switch (iconType) {
    case "ONI":
      return "👹"; // 鬼
    case "KITSUNE":
      return "🦊"; // 狐
    case "DOG":
      return "🐕"; // 犬
    case "DRAGON":
      return "🐉"; // 龍
    case "TEMPLE":
      return "🏯"; // 寺院・城
    case "SHRINE":
      return "⛩️"; // 神社
    case "TANUKI":
      return "🦝"; // 狸
    case "RABBIT":
      return "🐇"; // 兎
    case "OX":
      return "🐂"; // 牛
    case "HORSE":
      return "🐴"; // 馬
    case "BIRD":
      return "🐦"; // 鳥
    case "TENGU":
      return "👺"; // 天狗
    case "CROW_TENGU":
      return "🦅"; // 鴉天狗
    case "YATAGARASU":
      return "🐦‍⬛"; // 八咫烏
    case "TURTLE":
      return "🐢"; // 亀
    case "FISH":
      return "🐟"; // 魚
    case "WHALE":
      return "🐋"; // 鯨
    case "UMIBOUZU":
      return "🌊"; // 海坊主
    case "KAPPA":
      return "🥒"; // 河童（きゅうり）
    case "KAWAAKAGO":
      return "👶"; // 川赤子
    case "SUIKO":
      return "🦦"; // 水虎
    case "KODAMA":
      return "🌳"; // 木霊
    case "ANIMAL":
      return "🐾"; // 動物
    case "GENERIC":
      return "📍"; // 一般的な場所
    default:
      return "📍";
  }
}

function getIconLabel(iconType: SpotListItem["icon_type"]): string {
  switch (iconType) {
    case "ONI":
      return "鬼の伝承";
    case "KITSUNE":
      return "狐・稲荷";
    case "DOG":
      return "犬／番犬";
    case "DRAGON":
      return "龍・龍神";
    case "TEMPLE":
      return "寺院";
    case "SHRINE":
      return "神社";
    case "TANUKI":
      return "狸";
    case "RABBIT":
      return "兎";
    case "OX":
      return "牛";
    case "HORSE":
      return "馬";
    case "BIRD":
      return "鳥";
    case "TENGU":
      return "天狗";
    case "CROW_TENGU":
      return "鴉天狗";
    case "YATAGARASU":
      return "八咫烏";
    case "TURTLE":
      return "亀";
    case "FISH":
      return "魚";
    case "WHALE":
      return "鯨";
    case "UMIBOUZU":
      return "海坊主";
    case "KAPPA":
      return "河童";
    case "KAWAAKAGO":
      return "川赤子";
    case "SUIKO":
      return "水虎";
    case "KODAMA":
      return "木霊";
    case "ANIMAL":
      return "動物全般";
    case "GENERIC":
      return "その他";
    default:
      return "その他";
  }
}
