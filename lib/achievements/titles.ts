export type TitleDef = {
  slug: string;
  nameKey: string;
  level: number; // 1, 2, 3
  minAchievements: number;
  icon: string;
};

/**
 * Achievement-based titles.
 * Level 1: 10 achievements unlocked
 * Level 2: 20 achievements unlocked
 * Level 3: 30 achievements unlocked (all)
 *
 * When a user reaches a level they gain access to all titles
 * at ≤ their current level.
 */
export const TITLES: TitleDef[] = [
  {
    slug: "wanderer",
    nameKey: "title.wanderer",
    level: 1,
    minAchievements: 10,
    icon: "🌊",
  },
  {
    slug: "chronicler",
    nameKey: "title.chronicler",
    level: 2,
    minAchievements: 20,
    icon: "📜",
  },
  {
    slug: "pathfinder",
    nameKey: "title.pathfinder",
    level: 3,
    minAchievements: 30,
    icon: "🌟",
  },
];

export const TITLE_MAP = new Map(TITLES.map((t) => [t.slug, t]));

/** Get the highest available level for a given unlocked achievement count. */
export function getAchievementLevel(unlockedCount: number): number {
  if (unlockedCount >= 30) return 3;
  if (unlockedCount >= 20) return 2;
  if (unlockedCount >= 10) return 1;
  return 0;
}

/** Get titles the user has access to at this level. */
export function getTitlesForLevel(level: number): TitleDef[] {
  return TITLES.filter((t) => t.level <= level);
}
