import { PrismaClient } from '@prisma/client';

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const prisma = new PrismaClient();

// ぼかし処理関数
function applyBlur(lat: number, lng: number, radiusMeters: number) {
  const radiusInDegrees = radiusMeters / 111320; // 約111.32km per degree
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  const newLat = lat + y;
  const newLng = lng + x / Math.cos(lat * Math.PI / 180);
  return { lat: newLat, lng: newLng };
}

// 信頼度を推定
function estimateConfidence(locationType: string): number {
  switch (locationType) {
    case 'ROOFTOP':
      return 1.0;
    case 'RANGE_INTERPOLATED':
      return 0.8;
    case 'GEOMETRIC_CENTER':
      return 0.6;
    case 'APPROXIMATE':
      return 0.4;
    default:
      return 0.5;
  }
}

// ぼかし半径を選択
function selectBlurRadius(confidence: number): number {
  if (confidence >= 0.9) return 300;
  if (confidence >= 0.6) return 200;
  return 100;
}

// ジオコーディング
async function geocode(address: string) {
  const query = new URLSearchParams({
    address,
    key: GOOGLE_MAPS_API_KEY!,
    language: 'ja',
    region: 'jp',
  });

  const res = await fetch(`${GEOCODE_ENDPOINT}?${query.toString()}`);
  const data = await res.json();

  if (data.status !== 'OK' || data.results.length === 0) {
    console.error(`  ジオコーディング失敗: ${data.status}`);
    return null;
  }

  const result = data.results[0];
  const originalLat = result.geometry.location.lat;
  const originalLng = result.geometry.location.lng;
  const formattedAddress = result.formatted_address;
  const placeId = result.place_id;
  const locationType = result.geometry.location_type;

  const confidence = estimateConfidence(locationType);
  const blurRadius = selectBlurRadius(confidence);
  const blurred = applyBlur(originalLat, originalLng, blurRadius);

  const mapsQuery = new URLSearchParams({
    api: '1',
    query: formattedAddress,
  }).toString();

  return {
    address: formattedAddress,
    lat: blurred.lat,
    lng: blurred.lng,
    blur_radius_m: blurRadius,
    maps_query: mapsQuery,
    maps_place_id: placeId,
    original: { lat: originalLat, lng: originalLng, locationType, confidence }
  };
}

async function main() {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY が設定されていません');
    process.exit(1);
  }

  // Place IDが未設定のスポットを取得
  const spots = await prisma.spot.findMany({
    where: {
      OR: [
        { maps_place_id: null },
        { maps_place_id: '' }
      ]
    },
    orderBy: {
      title: 'asc'
    }
  });

  console.log(`更新対象: ${spots.length}件\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    console.log(`[${i + 1}/${spots.length}] ${spot.title}`);
    console.log(`  現在の住所: ${spot.address || '未設定'}`);

    // 住所がない場合はスキップ
    if (!spot.address) {
      console.log(`  スキップ: 住所が未設定\n`);
      failCount++;
      continue;
    }

    try {
      // ジオコーディング実行
      const geoData = await geocode(spot.address);

      if (!geoData) {
        console.log(`  失敗: ジオコーディングエラー\n`);
        failCount++;
        continue;
      }

      console.log(`  新しい住所: ${geoData.address}`);
      console.log(`  緯度: ${geoData.original.lat} → ${geoData.lat} (ぼかし適用)`);
      console.log(`  経度: ${geoData.original.lng} → ${geoData.lng} (ぼかし適用)`);
      console.log(`  ぼかし半径: ${geoData.blur_radius_m}m`);
      console.log(`  Place ID: ${geoData.maps_place_id}`);

      // データベース更新
      await prisma.spot.update({
        where: { id: spot.id },
        data: {
          address: geoData.address,
          lat: geoData.lat,
          lng: geoData.lng,
          blur_radius_m: geoData.blur_radius_m,
          maps_query: geoData.maps_query,
          maps_place_id: geoData.maps_place_id,
        },
      });

      console.log(`  ✓ 更新成功\n`);
      successCount++;

      // レート制限対策: 30 req/minなので2秒待機
      if (i < spots.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`  エラー:`, error);
      failCount++;
      console.log('');
    }
  }

  console.log('='.repeat(50));
  console.log(`処理完了`);
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${failCount}件`);
  console.log(`合計: ${spots.length}件`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
