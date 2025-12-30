import { PrismaClient } from '@prisma/client';

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const prisma = new PrismaClient();

// ジオコーディング（ぼかし処理なし）
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
    blur_radius_m: 0, // ぼかし処理なし
    maps_query: mapsQuery,
    maps_place_id: placeId,
  };
}

async function main() {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY が設定されていません');
    process.exit(1);
  }

  // 全スポットを取得
  const spots = await prisma.spot.findMany({
    where: {
      address: {
        not: null
      }
    },
    orderBy: {
      title: 'asc'
    }
  });

  console.log(`更新対象: ${spots.length}件`);
  console.log(`※ぼかし処理を適用せず、正確な位置情報を使用します\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];
    console.log(`[${i + 1}/${spots.length}] ${spot.title}`);
    console.log(`  現在の住所: ${spot.address}`);

    try {
      // ジオコーディング実行
      const geoData = await geocode(spot.address);

      if (!geoData) {
        console.log(`  失敗: ジオコーディングエラー\n`);
        failCount++;
        continue;
      }

      console.log(`  新しい住所: ${geoData.address}`);
      console.log(`  緯度: ${geoData.lat} (正確な位置)`);
      console.log(`  経度: ${geoData.lng} (正確な位置)`);
      console.log(`  ぼかし半径: ${geoData.blur_radius_m}m (ぼかしなし)`);
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
