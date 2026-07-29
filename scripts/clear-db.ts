/**
 * Clear all data from the database.
 * Run: npx dotenv -e .env -- npx tsx scripts/clear-db.ts
 * Or just: npx tsx scripts/clear-db.ts  (if DATABASE_URL is in env)
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL not set. Run with: npx dotenv -e .env -- npx tsx scripts/clear-db.ts");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  console.log("🗑️  Clearing all data...\n");

  // Delete in safe order (no FK constraints, but logical)
  const deleted = {
    unlockedAchievements: await prisma.unlockedAchievement.deleteMany(),
    threads: await prisma.memoryThread.deleteMany(),
    collections: await prisma.collection.deleteMany(),
    memories: await prisma.memory.deleteMany(),
    profiles: await prisma.profile.deleteMany(),
  };

  console.log("✅ Database cleared:");
  for (const [key, result] of Object.entries(deleted)) {
    console.log(`   ${key}: ${result.count} records deleted`);
  }

  await prisma.$disconnect();
  console.log("\n✨ Done! Ready for a fresh start.");
}

main().catch((e) => {
  console.error("❌ Error clearing database:", e);
  process.exit(1);
});
