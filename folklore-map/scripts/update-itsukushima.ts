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

async function main() {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY が設定されていません');
    process.exit(1);
  }

  // 厳島神社の正しい住所でジオコーディング
  const address = "広島県廿日市市宮島町1-1 厳島神社";
  const query = new URLSearchParams({
    address,
    key: GOOGLE_MAPS_API_KEY,
    language: 'ja',
    region: 'jp',
  });

  console.log('ジオコーディング中...');
  const res = await fetch(`${GEOCODE_ENDPOINT}?${query.toString()}`);
  const data = await res.json();

  if (data.status !== 'OK' || data.results.length === 0) {
    console.error('ジオコーディング失敗:', data);
    process.exit(1);
  }

  const result = data.results[0];
  const originalLat = result.geometry.location.lat;
  const originalLng = result.geometry.location.lng;
  const formattedAddress = result.formatted_address;
  const placeId = result.place_id;

  console.log('取得した位置情報:');
  console.log('  住所:', formattedAddress);
  console.log('  緯度:', originalLat);
  console.log('  経度:', originalLng);
  console.log('  Place ID:', placeId);

  // 300mのぼかしを適用（神社は高精度なので最大のぼかし）
  const blurred = applyBlur(originalLat, originalLng, 300);

  console.log('\nぼかし適用後:');
  console.log('  緯度:', blurred.lat);
  console.log('  経度:', blurred.lng);
  console.log('  ぼかし半径: 300m');

  // Google Maps検索用クエリ
  const mapsQuery = new URLSearchParams({
    api: '1',
    query: formattedAddress,
  }).toString();

  // データベース更新
  console.log('\nデータベース更新中...');
  const updated = await prisma.spot.update({
    where: {
      id: 'cmhraum0j003s3oiafze3kkre', // 厳島神社のID
    },
    data: {
      address: formattedAddress,
      lat: blurred.lat,
      lng: blurred.lng,
      blur_radius_m: 300,
      maps_query: mapsQuery,
      maps_place_id: placeId,
    },
  });

  console.log('更新完了:', updated.title);
  console.log('ID:', updated.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
