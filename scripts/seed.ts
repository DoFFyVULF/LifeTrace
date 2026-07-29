import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  DEMO_MEMORIES,
  DEMO_THREADS,
  DEMO_UNLOCKED_ACHIEVEMENTS,
  DEMO_PROFILE,
} from "@/lib/demo-data";

// ─── DB connection ─────────────────────────────────────────────────

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set. Create a .env file.");
    process.exit(1);
  }

  const prisma = createClient();
  console.log("🌱 Seeding Life Trace…\n");

  // Clear existing data
  await prisma.memoryThread.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.unlockedAchievement.deleteMany();
  await prisma.memory.deleteMany();

  // Reset profile
  const existingProfile = await prisma.profile.findUnique({
    where: { id: "singleton" },
  });
  if (existingProfile) {
    await prisma.profile.update({
      where: { id: "singleton" },
      data: DEMO_PROFILE,
    });
  } else {
    await prisma.profile.create({
      data: DEMO_PROFILE,
    });
  }

  // Create memories
  const createdIds: string[] = [];
  for (const m of DEMO_MEMORIES) {
    const memory = await prisma.memory.create({
      data: {
        id: `seed-${DEMO_MEMORIES.indexOf(m)}`,
        ...m,
      },
    });
    createdIds.push(memory.id);
    console.log(`  ✓ ${m.title}`);
  }

  // Create threads
  for (const t of DEMO_THREADS) {
    const ids = t.memoryIds.map((i) => createdIds[i]);
    await prisma.memoryThread.create({
      data: { memoryIds: ids },
    });
    const names = t.memoryIds.map((i) => DEMO_MEMORIES[i].title);
    console.log(`  ~ Thread: ${names.join(" → ")}`);
  }

  // Unlock achievements
  for (const id of DEMO_UNLOCKED_ACHIEVEMENTS) {
    await prisma.unlockedAchievement.create({
      data: {
        achievementId: id,
        unlockedAt: new Date("2026-01-01"),
      },
    });
  }
  console.log(`  🏆 ${DEMO_UNLOCKED_ACHIEVEMENTS.length} achievements unlocked`);

  console.log(`\n✅ Done! ${DEMO_MEMORIES.length} memories, ${DEMO_THREADS.length} threads seeded.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
