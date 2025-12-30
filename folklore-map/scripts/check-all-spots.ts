import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const spots = await prisma.spot.findMany({
    include: {
      sources: true
    },
    orderBy: {
      title: 'asc'
    }
  });

  console.log(`総スポット数: ${spots.length}\n`);

  spots.forEach((spot, index) => {
    console.log(`${index + 1}. ${spot.title}`);
    console.log(`   ID: ${spot.id}`);
    console.log(`   住所: ${spot.address || '未設定'}`);
    console.log(`   緯度: ${spot.lat}`);
    console.log(`   経度: ${spot.lng}`);
    console.log(`   ぼかし半径: ${spot.blur_radius_m}m`);
    console.log(`   Place ID: ${spot.maps_place_id || '未設定'}`);
    console.log(`   ステータス: ${spot.status}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
