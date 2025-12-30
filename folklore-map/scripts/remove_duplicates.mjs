import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicates() {
  const spots = await prisma.spot.findMany({
    select: {
      id: true,
      title: true,
      updated_at: true,
    },
    orderBy: { title: 'asc' },
  });

  const titleGroups = new Map();

  for (const spot of spots) {
    const existing = titleGroups.get(spot.title) || [];
    existing.push(spot);
    titleGroups.set(spot.title, existing);
  }

  const duplicates = Array.from(titleGroups.entries())
    .filter(([_, spots]) => spots.length > 1);

  console.log(`Total spots: ${spots.length}`);
  console.log(`Duplicate titles found: ${duplicates.length}\n`);

  let totalDeleted = 0;

  for (const [title, dupeSpots] of duplicates) {
    // Sort by updated_at descending (newest first)
    const sorted = dupeSpots.sort((a, b) => b.updated_at - a.updated_at);

    // Keep the newest, delete the rest
    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);

    console.log(`\n"${title}":`);
    console.log(`  Keeping: ${toKeep.id} (Updated: ${toKeep.updated_at.toISOString()})`);

    for (const spot of toDelete) {
      console.log(`  Deleting: ${spot.id} (Updated: ${spot.updated_at.toISOString()})`);
      await prisma.spot.delete({
        where: { id: spot.id }
      });
      totalDeleted++;
    }
  }

  console.log(`\n✅ Deleted ${totalDeleted} duplicate spots`);
  console.log(`Remaining spots: ${spots.length - totalDeleted}`);

  await prisma.$disconnect();
}

removeDuplicates().catch(e => {
  console.error(e);
  process.exit(1);
});
