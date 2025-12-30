import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.spot.count();
  console.log(`総スポット数: ${total}件`);

  const byIcon = await prisma.spot.groupBy({
    by: ['icon_type'],
    _count: { icon_type: true }
  });

  console.log('\nアイコン種別ごとの件数:');
  byIcon.sort((a, b) => b._count.icon_type - a._count.icon_type);
  byIcon.forEach(g => console.log(`  ${g.icon_type}: ${g._count.icon_type}件`));

  // タイトル一覧も表示
  const spots = await prisma.spot.findMany({
    select: { title: true },
    orderBy: { title: 'asc' }
  });

  console.log('\n現在のスポット一覧:');
  spots.forEach((s, i) => {
    console.log(`${i + 1}. ${s.title}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
