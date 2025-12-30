import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const spots = await prisma.spot.findMany({
    take: 10,
    orderBy: { title: 'asc' }
  });

  console.log(`サンプル確認（10件）:\n`);
  spots.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}`);
    console.log(`   住所: ${s.address || '未設定'}`);
    console.log(`   Place ID: ${s.maps_place_id || '未設定'}`);
    console.log(`   ぼかし: ${s.blur_radius_m}m`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
