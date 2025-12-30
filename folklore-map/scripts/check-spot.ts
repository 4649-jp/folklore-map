import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const spots = await prisma.spot.findMany({
    where: {
      title: {
        contains: '厳島',
        mode: 'insensitive'
      }
    },
    include: {
      sources: true
    }
  });
  console.log(JSON.stringify(spots, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
