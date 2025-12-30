import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findDuplicates() {
  const spots = await prisma.spot.findMany({
    select: {
      id: true,
      title: true,
      lat: true,
      lng: true,
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

  for (const [title, dupeSpots] of duplicates) {
    console.log(`\n"${title}" (${dupeSpots.length} entries):`);
    dupeSpots.forEach((s, i) => {
      console.log(`  ${i + 1}. ID: ${s.id} | Lat: ${s.lat.toFixed(6)} | Lng: ${s.lng.toFixed(6)} | Updated: ${s.updated_at.toISOString()}`);
    });
  }

  await prisma.$disconnect();
}

findDuplicates();
