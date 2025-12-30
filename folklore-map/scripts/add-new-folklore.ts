import { PrismaClient, SourceType } from '@prisma/client';
import newData from './new-folklore-data.json';

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const USER_ID = "folklore-update-2025";

const prisma = new PrismaClient();

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
  const lat = result.geometry.location.lat;
  const lng = result.geometry.location.lng;
  const formattedAddress = result.formatted_address;
  const placeId = result.place_id;

  const mapsQuery = new URLSearchParams({
    api: '1',
    query: formattedAddress,
  }).toString();

  return {
    address: formattedAddress,
    lat,
    lng,
    blur_radius_m: 0,
    maps_query: mapsQuery,
    maps_place_id: placeId,
  };
}

async function main() {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY が設定されていません');
    process.exit(1);
  }

  console.log(`追加対象: ${newData.length}件\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < newData.length; i++) {
    const item = newData[i];
    console.log(`[${i + 1}/${newData.length}] ${item.title}`);
    console.log(`  住所: ${item.address}`);

    try {
      // ジオコーディング実行
      const geoData = await geocode(item.address);

      if (!geoData) {
        console.log(`  失敗: ジオコーディングエラー\n`);
        failCount++;
        continue;
      }

      console.log(`  正式住所: ${geoData.address}`);
      console.log(`  緯度: ${geoData.lat}`);
      console.log(`  経度: ${geoData.lng}`);
      console.log(`  Place ID: ${geoData.maps_place_id}`);

      // データベースに追加
      const result = await prisma.$transaction(async (tx) => {
        const spot = await tx.spot.create({
          data: {
            title: item.title,
            description: item.description,
            address: geoData.address,
            maps_query: geoData.maps_query,
            maps_place_id: geoData.maps_place_id,
            icon_type: item.icon_type,
            lat: geoData.lat,
            lng: geoData.lng,
            blur_radius_m: geoData.blur_radius_m,
            era_hint: item.era_hint || null,
            created_by: USER_ID,
            status: "PUBLISHED",
          },
        });

        if (item.sources && item.sources.length > 0) {
          await tx.source.createMany({
            data: item.sources.map((source) => ({
              spot_id: spot.id,
              type: source.type as SourceType,
              citation: source.citation,
              url: source.url,
            })),
          });
        }

        return spot;
      });

      console.log(`  ✓ 追加完了 (ID: ${result.id})\n`);
      successCount++;

      // レート制限対策
      if (i < newData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`  エラー:`, error);
      failCount++;
      console.log('');
    }
  }

  console.log('=' .repeat(50));
  console.log(`処理完了`);
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${failCount}件`);
  console.log(`合計: ${newData.length}件`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
