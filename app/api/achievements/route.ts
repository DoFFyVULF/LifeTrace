import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACHIEVEMENTS,
  buildCheckerData,
  isAchievementUnlocked,
} from "@/lib/achievements";
import type { AchievementWithStatus } from "@/lib/achievements/types";

/**
 * GET /api/achievements
 *
 * Returns all achievements with their unlock status.
 * Uses stored UnlockedAchievement records for timestamps;
 * for the unlocked flag, also recomputes from current DB data
 * (so an achievement the user meets criteria for shows as unlocked
 * even before the check endpoint stores it).
 *
 * Achievement 25 is the exception — it is only stored client-side,
 * so it relies entirely on the stored record.
 */
export async function GET() {
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
    // #25 only via stored; rest: computed OR stored
    const unlocked = a.id === 25 ? stored : computed || stored;
    return {
      ...a,
      unlocked,
      unlockedAt: storedMap.get(a.id) ?? null,
    };
  });

  return Response.json(result);
}
