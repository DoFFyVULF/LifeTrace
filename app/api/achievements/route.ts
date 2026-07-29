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
 * GET /api/achievements
 *
 * In demo mode — computes from static DEMO_* data.
 */
export async function GET() {
  if (!prisma) {
    return Response.json(demoAchievementStatus());
  }

  const [memories, threads, profile] = await Promise.all([
    prisma.memory.findMany(),
    prisma.memoryThread.findMany(),
    prisma.profile
      .findUnique({ where: { id: "singleton" } })
      .then((p) => p ?? { name: "", avatarPath: null, locale: "en" }),
  ]);

  const storedUnlocks = await prisma.unlockedAchievement.findMany();
  const storedMap = new Map(
    storedUnlocks.map((u) => [u.achievementId, u.unlockedAt.toISOString()]),
  );

  const checkerData = buildCheckerData(memories, threads, profile);

  const result: AchievementWithStatus[] = ACHIEVEMENTS.map((a) => {
    const computed = isAchievementUnlocked(a.id, checkerData);
    const stored = storedMap.has(a.id);
    const unlocked = a.id === 25 ? stored : computed || stored;
    return {
      ...a,
      unlocked,
      unlockedAt: storedMap.get(a.id) ?? null,
    };
  });

  return Response.json(result);
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
