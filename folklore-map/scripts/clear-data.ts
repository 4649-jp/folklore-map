import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all data...");
  
  await prisma.flag.deleteMany({});
  console.log("✓ Flags deleted");
  
  await prisma.source.deleteMany({});
  console.log("✓ Sources deleted");
  
  await prisma.spot.deleteMany({});
  console.log("✓ Spots deleted");
  
  console.log("\nAll data cleared successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
