"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Search, Filter, X } from "lucide-react";

import { cn } from "@/lib/utils";

import { SpotMap, type MapBounds } from "./spot-map";
import type { SpotDetail, SpotListItem } from "./spot-types";

type SpotExplorerProps = {
  spots: SpotListItem[];
};

const ICON_TYPE_OPTIONS = [
  { value: "ONI", label: "鬼の伝承" },
  { value: "KITSUNE", label: "狐・稲荷" },
  { value: "DOG", label: "犬／番犬" },
  { value: "DRAGON", label: "龍・龍神" },
  { value: "TEMPLE", label: "寺院" },
  { value: "SHRINE", label: "神社" },
  { value: "TANUKI", label: "狸" },
  { value: "RABBIT", label: "兎" },
  { value: "OX", label: "牛" },
  { value: "HORSE", label: "馬" },
  { value: "BIRD", label: "鳥" },
  { value: "TENGU", label: "天狗" },
  { value: "CROW_TENGU", label: "鴉天狗" },
  { value: "YATAGARASU", label: "八咫烏" },
  { value: "TURTLE", label: "亀" },
  { value: "FISH", label: "魚" },
  { value: "WHALE", label: "鯨" },
  { value: "UMIBOUZU", label: "海坊主" },
  { value: "KAPPA", label: "河童" },
  { value: "KAWAAKAGO", label: "川赤子" },
  { value: "SUIKO", label: "水虎" },
  { value: "KODAMA", label: "木霊" },
  { value: "ANIMAL", label: "動物全般" },
  { value: "GENERIC", label: "その他" },
] as const;

export function SpotExplorer({ spots: initialSpots }: SpotExplorerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSpots[0]?.id ?? null
  );
  const [filterTerm, setFilterTerm] = useState("");
  const [details, setDetails] = useState<Record<string, SpotDetail>>({});
  const [detailStatus, setDetailStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");

  // いいね機能
  const [likeCount, setLikeCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isLiking, setIsLiking] = useState<boolean>(false);

  // 高度検索フィルター
  const [selectedIconTypes, setSelectedIconTypes] = useState<string[]>([]);
  const [eraFilter, setEraFilter] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [spots, setSpots] = useState<SpotListItem[]>(initialSpots);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);

  // スポットリストへの参照
  const spotListRef = useRef<HTMLDivElement | null>(null);
  const spotItemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // URLクエリパラメータから初期値を読み込む
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const iconTypesParam = params.get("icon_types");
    const eraParam = params.get("era");
    const qParam = params.get("q");

    if (iconTypesParam) {
      setSelectedIconTypes(iconTypesParam.split(",").filter(Boolean));
      setShowAdvancedSearch(true);
    }
    if (eraParam) {
      setEraFilter(eraParam);
      setShowAdvancedSearch(true);
    }
    if (qParam) {
      setFilterTerm(qParam);
    }
  }, []);

  // フィルター適用時にAPIからデータを再取得
  const applyFilters = useCallback(async () => {
    setIsLoadingSpots(true);

    const params = new URLSearchParams();
    if (filterTerm) params.set("q", filterTerm);
    if (selectedIconTypes.length > 0) params.set("icon_types", selectedIconTypes.join(","));
    if (eraFilter) params.set("era", eraFilter);
    // bbox フィルターは無効化（全スポットを表示）
    // if (mapBounds) {
    //   params.set("bbox", `${mapBounds.west},${mapBounds.south},${mapBounds.east},${mapBounds.north}`);
    // }

    // URLを更新（ブックマーク可能に）
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);

    try {
      const res = await fetch(`/api/spots?${params.toString()}`);
      if (!res.ok) throw new Error("検索に失敗しました");
      const response = await res.json();
      const data = response.data || response;
      setSpots(data.items || data.spots || []);
    } catch (error) {
      console.error("スポット検索エラー:", error);
      setSpots([]);
    } finally {
      setIsLoadingSpots(false);
    }
  }, [filterTerm, selectedIconTypes, eraFilter]);

  // フィルターが実際に適用された時のみAPIを呼ぶ
  useEffect(() => {
    const hasFilters = filterTerm || selectedIconTypes.length > 0 || eraFilter;

    // フィルターがない場合は初期状態に戻す
    if (!hasFilters) {
      setSpots(initialSpots);
      // URLパラメータもクリア
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
      return;
    }

    // フィルターが適用されている場合のみAPIを呼ぶ
    const timer = setTimeout(() => {
      void applyFilters();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTerm, selectedIconTypes.length, eraFilter]);

  const filteredSpots = useMemo(() => {
    return spots;
  }, [spots]);

  useEffect(() => {
    if (filteredSpots.length === 0) {
      setSelectedId(null);
      return;
    }
    // 現在選択中のスポットがフィルター後も含まれている場合は維持
    if (selectedId && filteredSpots.some((spot) => spot.id === selectedId)) {
      return;
    }
    // フィルター適用時は自動選択しない（地図が全体を表示するため）
    setSelectedId(null);
  }, [filteredSpots, selectedId]);

  // 選択されたスポットにスクロール
  useEffect(() => {
    if (!selectedId) return;

    const selectedElement = spotItemRefs.current.get(selectedId);
    if (selectedElement && spotListRef.current) {
      // スムーズにスクロール
      selectedElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || details[selectedId]) {
      return;
    }

    let cancelled = false;
    setDetailStatus("loading");

    async function fetchDetail() {
      if (!selectedId) return;

      try {
        const res = await fetch(`/api/spots/${selectedId}`);
        if (!res.ok) {
          throw new Error("詳細情報の取得に失敗しました。");
        }
        const body = (await res.json()) as { data: SpotDetail };
        if (!cancelled && selectedId) {
          setDetails((prev) => ({ ...prev, [selectedId]: body.data }));
          setDetailStatus("idle");
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setDetailStatus("error");
        }
      }
    }

    void fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedId, details]);

  // セッションIDを取得または生成
  const getSessionId = useCallback(() => {
    if (typeof window === "undefined") return "";

    let sessionId = localStorage.getItem("folklore_session_id");
    if (!sessionId) {
      // 暗号学的に安全な乱数生成（XSS/セッション予測攻撃対策）
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      sessionId = `session_${Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('')}`;
      localStorage.setItem("folklore_session_id", sessionId);
    }
    return sessionId;
  }, []);

  // いいね数を取得
  useEffect(() => {
    if (!selectedId) return;

    async function fetchLikeCount() {
      try {
        const res = await fetch(`/api/spots/${selectedId}/like`);
        if (res.ok) {
          const data = await res.json();
          setLikeCount(data.data.like_count);

          // ローカルストレージで自分がいいねしたかチェック
          const sessionId = getSessionId();
          const likedSpots = JSON.parse(localStorage.getItem("liked_spots") || "[]");
          setIsLiked(likedSpots.includes(selectedId));
        }
      } catch (error) {
        console.error("いいね数の取得エラー:", error);
      }
    }

    void fetchLikeCount();
  }, [selectedId, getSessionId]);

  // いいねボタンのハンドラー
  const handleLike = useCallback(async () => {
    if (!selectedId || isLiking) return;

    setIsLiking(true);
    try {
      const sessionId = getSessionId();
      const res = await fetch(`/api/spots/${selectedId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.data.like_count);
        setIsLiked(data.data.liked);

        // ローカルストレージを更新
        const likedSpots = JSON.parse(localStorage.getItem("liked_spots") || "[]");
        if (data.data.liked) {
          likedSpots.push(selectedId);
        } else {
          const index = likedSpots.indexOf(selectedId);
          if (index > -1) likedSpots.splice(index, 1);
        }
        localStorage.setItem("liked_spots", JSON.stringify(likedSpots));
      }
    } catch (error) {
      console.error("いいねエラー:", error);
    } finally {
      setIsLiking(false);
    }
  }, [selectedId, isLiking, getSessionId]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return filteredSpots.find((spot) => spot.id === selectedId) ?? null;
  }, [selectedId, filteredSpots]);

  const selectedDetail = selectedId ? details[selectedId] : null;

  const toggleIconType = (iconType: string) => {
    setSelectedIconTypes((prev) =>
      prev.includes(iconType)
        ? prev.filter((t) => t !== iconType)
        : [...prev, iconType]
    );
  };

  const clearAllFilters = () => {
    setFilterTerm("");
    setSelectedIconTypes([]);
    setEraFilter("");
    setShowAdvancedSearch(false);
    setSpots(initialSpots); // 初期状態に戻す

    // URLパラメータもクリア
    window.history.replaceState({}, "", window.location.pathname);
  };

  const hasActiveFilters = selectedIconTypes.length > 0 || eraFilter || filterTerm;

  return (
    <div className="space-y-6">
      {/* 検索バー */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              スポット一覧
            </h2>
            <p className="text-xs text-muted-foreground">
              検索結果: {filteredSpots.length} 件
              {isLoadingSpots && " (読み込み中...)"}
            </p>
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={filterTerm}
                onChange={(event) => setFilterTerm(event.target.value)}
                placeholder="キーワードで検索"
                className="w-full rounded-md border border-border bg-background pl-9 pr-9 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent transition focus:border-primary focus:ring-primary/30"
              />
              {filterTerm && (
                <button
                  type="button"
                  onClick={() => setFilterTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  aria-label="検索クリア"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
                showAdvancedSearch
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">フィルター</span>
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
                title="すべてのフィルターをクリア"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">クリア</span>
              </button>
            )}
          </div>
        </div>

        {/* 高度検索パネル */}
        {showAdvancedSearch && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">高度検索</h3>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <X className="h-3 w-3" />
                  すべてクリア
                </button>
              )}
            </div>

            {/* アイコンタイプフィルター */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                カテゴリ
              </label>
              <div className="flex flex-wrap gap-2">
                {ICON_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleIconType(option.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition border",
                      selectedIconTypes.includes(option.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {selectedIconTypes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedIconTypes.length} 件選択中
                </p>
              )}
            </div>

            {/* 時代フィルター */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">
                時代
              </label>
              <input
                type="text"
                value={eraFilter}
                onChange={(e) => setEraFilter(e.target.value)}
                placeholder="例: 江戸時代、平安時代、明治"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-1 ring-transparent transition focus:border-primary focus:ring-primary/30"
              />
              {eraFilter && (
                <p className="text-xs text-muted-foreground">
                  「{eraFilter}」を含むスポットを検索
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
        <SpotMap
          spots={filteredSpots}
          selectedId={selectedId}
          onMarkerSelect={setSelectedId}
        />

        <section className="flex h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">
            スポット一覧（{filteredSpots.length} 件）
          </h2>
          <p className="text-xs text-muted-foreground">
            マップのピンまたはリストを選択すると詳細が表示されます。
            {hasActiveFilters && " フィルター適用中"}
          </p>
        </header>

        <div ref={spotListRef} className="flex-1 overflow-y-auto">
          {filteredSpots.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
              条件に一致するスポットがありません。
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredSpots.map((spot) => (
                <li key={spot.id}>
                  <button
                    ref={(el) => {
                      if (el) {
                        spotItemRefs.current.set(spot.id, el);
                      } else {
                        spotItemRefs.current.delete(spot.id);
                      }
                    }}
                    type="button"
                    onClick={() => setSelectedId(spot.id)}
                    className={cn(
                      "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-all duration-300 hover:bg-muted/60",
                      selectedId === spot.id && "bg-primary/10 ring-2 ring-primary/30 ring-inset"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: getStatusColor(spot.icon_type) }}
                      />
                      {spot.title}
                    </span>
                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                      最終更新:{" "}
                      {format(new Date(spot.updated_at), "yyyy年MM月dd日 HH:mm", {
                        locale: ja,
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected ? (
          <footer className="border-t border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
            <p>
              選択中: <span className="font-medium text-foreground">{selected.title}</span>
            </p>
            <p>アイコン種別: {getIconLabel(selected.icon_type)}</p>
          </footer>
        ) : null}
      </section>
      </div>

      {selected ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {selected.title}
              </h3>
              <p className="text-xs uppercase text-muted-foreground">
                ステータス: {translateStatus(selected.status)}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {getIconLabel(selected.icon_type)}
            </span>
          </div>

          {detailStatus === "loading" && (
            <p className="mt-4 text-sm text-muted-foreground">
              詳細読み込み中…
            </p>
          )}

          {detailStatus === "error" && (
            <p className="mt-4 text-sm text-red-600">
              詳細の取得に失敗しました。ネットワーク状態を確認して再度選択してください。
            </p>
          )}

          {selectedDetail && (
            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              {selectedDetail.address && (
                <p className="text-foreground">
                  <span className="font-semibold text-sm text-muted-foreground">
                    住所:
                  </span>{" "}
                  {selectedDetail.address}
                </p>
              )}
              {selectedDetail.maps_query && (
                <a
                  href={`https://www.google.com/maps/search/?${selectedDetail.maps_query}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-primary underline"
                >
                  Google マップで開く
                </a>
              )}

              {/* いいねボタン */}
              <div className="flex items-center gap-3 py-3 border-t border-b border-gray-200">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all",
                    isLiked
                      ? "bg-pink-100 text-pink-600 hover:bg-pink-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                    isLiking && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="text-xl">
                    {isLiked ? "❤️" : "🤍"}
                  </span>
                  <span className="text-sm">
                    いいね {likeCount > 0 && `(${likeCount})`}
                  </span>
                </button>
              </div>

              <p className="whitespace-pre-wrap">{selectedDetail.description}</p>
              {selectedDetail.sources.length > 0 && (
                <div>
                  <p className="font-semibold text-foreground">出典</p>
                  <ul className="mt-2 space-y-1">
                    {selectedDetail.sources.map((source) => (
                      <li key={source.id}>
                        <span className="text-xs text-muted-foreground">
                          [{translateSourceType(source.type)}]
                        </span>{" "}
                        {source.citation}
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-2 text-xs text-primary underline"
                          >
                            リンク
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function getStatusColor(iconType: SpotListItem["icon_type"]) {
  switch (iconType) {
    case "ONI":
      return "#ef4444";
    case "KITSUNE":
      return "#f97316";
    case "DOG":
      return "#facc15";
    case "DRAGON":
      return "#22d3ee";
    case "TEMPLE":
      return "#6366f1";
    case "SHRINE":
      return "#10b981";
    case "TANUKI":
      return "#8b5cf6";
    case "RABBIT":
      return "#ec4899";
    case "OX":
      return "#a78bfa";
    case "HORSE":
      return "#fb923c";
    case "BIRD":
      return "#38bdf8";
    case "TENGU":
      return "#dc2626";
    case "CROW_TENGU":
      return "#991b1b";
    case "YATAGARASU":
      return "#1e293b";
    case "TURTLE":
      return "#059669";
    case "FISH":
      return "#06b6d4";
    case "WHALE":
      return "#0284c7";
    case "UMIBOUZU":
      return "#0369a1";
    case "KAPPA":
      return "#16a34a";
    case "KAWAAKAGO":
      return "#f472b6";
    case "SUIKO":
      return "#0891b2";
    case "KODAMA":
      return "#65a30d";
    case "ANIMAL":
      return "#14b8a6";
    default:
      return "#64748b";
  }
}

function getIconLabel(iconType: SpotListItem["icon_type"]) {
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
    default:
      return "その他";
  }
}

function translateSourceType(type: SpotDetail["sources"][number]["type"]) {
  switch (type) {
    case "URL":
      return "ウェブ";
    case "BOOK":
      return "書籍";
    case "INTERVIEW":
      return "聞き取り";
    default:
      return "出典";
  }
}

function translateStatus(status: SpotListItem["status"]) {
  switch (status) {
    case "PUBLISHED":
      return "公開";
    case "REVIEW":
      return "レビュー待ち";
    case "DRAFT":
      return "下書き";
    default:
      return status;
  }
}
