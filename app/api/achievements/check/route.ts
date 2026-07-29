import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_MAP,
  buildCheckerData,
  isAchievementUnlocked,
} from "@/lib/achievements";
import type { AchievementWithStatus } from "@/lib/achievements/types";

/**
 * POST /api/achievements/check
 *
 * Check all achievements against current DB data.
 * Any newly unlocked achievements get stored so we can
 * record the unlockedAt timestamp.
 *
 * Body (optional): { forceIds?: number[] }
 * forceIds lets the client request a re-check for specific
 * achievements (e.g. #25 after an EXIF GPS import).
 *
 * Returns: { newlyUnlocked: AchievementWithStatus[], all: AchievementWithStatus[] }
 */
export async function POST(request: NextRequest) {
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

  // For each achievement, check if it should be unlocked
  for (const a of ACHIEVEMENTS) {
    const alreadyStored = storedIds.has(a.id);

    // For #25, only unlock when explicitly forced
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

    // Skip if already stored
    if (alreadyStored) continue;

    // Check if unlocked by criteria
    const unlocked = isAchievementUnlocked(a.id, checkerData);
    if (unlocked) {
      await prisma.unlockedAchievement.create({
        data: { achievementId: a.id },
      });
      const now = new Date().toISOString();
      newlyUnlocked.push({ ...a, unlocked: true, unlockedAt: now });
    }
  }

  // Build full list with current status
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
