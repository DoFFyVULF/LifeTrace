import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACHIEVEMENTS,
  buildCheckerData,
  isAchievementUnlocked,
} from "@/lib/achievements";
import type { AchievementWithStatus } from "@/lib/achievements/types";
import {
  DEMO_MEMORIES,
  DEMO_THREADS,
  DEMO_PROFILE,
  DEMO_UNLOCKED_MAP,
} from "@/lib/demo-data";

/**
 * POST /api/achievements/check
 *
 * Check all achievements against current data.
 * In demo mode — returns computed status without storing anything.
 */
export async function POST(request: NextRequest) {
  if (!prisma) {
    const status = demoAchievementStatus();
    return Response.json({ newlyUnlocked: [], all: status });
  }

  const body = await request.json().catch(() => ({}));
  const forceIds: number[] = body?.forceIds ?? [];

  const [memories, threads, profile, storedUnlocks] = await Promise.all([
    prisma.memory.findMany(),
    prisma.memoryThread.findMany(),
    prisma.profile
      .findUnique({ where: { id: "singleton" } })
      .then((p) => p ?? { name: "", avatarPath: null, locale: "en" }),
    prisma.unlockedAchievement.findMany(),
  ]);

  const storedIds = new Set(storedUnlocks.map((u) => u.achievementId));
  const storedMap = new Map(
    storedUnlocks.map((u) => [u.achievementId, u.unlockedAt.toISOString()]),
  );

  const checkerData = buildCheckerData(memories, threads, profile);

  const newlyUnlocked: AchievementWithStatus[] = [];

  for (const a of ACHIEVEMENTS) {
    const alreadyStored = storedIds.has(a.id);

    if (a.id === 25) {
      if (forceIds.includes(25) && !alreadyStored) {
        await prisma.unlockedAchievement.create({
          data: { achievementId: 25 },
        });
        const stored = await prisma.unlockedAchievement.findFirst({
          where: { achievementId: 25 },
        });
        const ts = stored?.unlockedAt.toISOString() ?? new Date().toISOString();
        newlyUnlocked.push({ ...a, unlocked: true, unlockedAt: ts });
      }
      continue;
    }

    if (alreadyStored) continue;

    const unlocked = isAchievementUnlocked(a.id, checkerData);
    if (unlocked) {
      await prisma.unlockedAchievement.create({
        data: { achievementId: a.id },
      });
      const now = new Date().toISOString();
      newlyUnlocked.push({ ...a, unlocked: true, unlockedAt: now });
    }
  }

  const allStored = await prisma.unlockedAchievement.findMany();
  const allStoredMap = new Map(
    allStored.map((u) => [u.achievementId, u.unlockedAt.toISOString()]),
  );

  const all: AchievementWithStatus[] = ACHIEVEMENTS.map((a) => {
    const computed = isAchievementUnlocked(a.id, checkerData);
    const stored = allStoredMap.has(a.id);
    const unlocked = a.id === 25 ? stored : computed || stored;
    return {
      ...a,
      unlocked,
      unlockedAt: allStoredMap.get(a.id) ?? null,
    };
  });

  return Response.json({ newlyUnlocked, all });
}

// ─── Demo helper ────────────────────────────────────────────────────

function demoAchievementStatus(): AchievementWithStatus[] {
  const memories = DEMO_MEMORIES.map((m, i) => ({
    id: `seed-${i}`,
    ...m,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const threads = DEMO_THREADS.map((t, i) => ({
    id: `seed-thread-${i}`,
    memoryIds: t.memoryIds.map((idx) => `seed-${idx}`),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const profile = {
    name: DEMO_PROFILE.name,
    avatarPath: DEMO_PROFILE.avatarPath,
    locale: DEMO_PROFILE.locale,
  };

  const checkerData = buildCheckerData(memories as any, threads as any, profile);

  return ACHIEVEMENTS.map((a) => {
    const computed = isAchievementUnlocked(a.id, checkerData);
    const stored = DEMO_UNLOCKED_MAP.has(a.id);
    const unlocked = a.id === 25 ? stored : computed || stored;
    return {
      ...a,
      unlocked,
      unlockedAt: stored ? "2026-01-01T00:00:00.000Z" : null,
    };
  });
}
