import type { Memory, MemoryThread } from "@prisma/client";
import type { Achievement, AchievementWithStatus } from "./types";

export const ACHIEVEMENTS: Achievement[] = [
  // 🏁 Раздел: Начало пути (1–4)
  { id: 1, titleKey: "achievement.1.title", sectionKey: "achievement.section.beginning", descriptionKey: "achievement.1.desc", imagePath: "/achievements/Achievements 1.webp" },
  { id: 2, titleKey: "achievement.2.title", sectionKey: "achievement.section.beginning", descriptionKey: "achievement.2.desc", imagePath: "/achievements/Achievements 2.webp" },
  { id: 3, titleKey: "achievement.3.title", sectionKey: "achievement.section.beginning", descriptionKey: "achievement.3.desc", imagePath: "/achievements/Achievements 3.webp" },
  { id: 4, titleKey: "achievement.4.title", sectionKey: "achievement.section.beginning", descriptionKey: "achievement.4.desc", imagePath: "/achievements/Achievements 4.webp" },

  // 🗺️ Раздел: Картограф (5–9)
  { id: 5, titleKey: "achievement.5.title", sectionKey: "achievement.section.cartographer", descriptionKey: "achievement.5.desc", imagePath: "/achievements/Achievements 5.webp" },
  { id: 6, titleKey: "achievement.6.title", sectionKey: "achievement.section.cartographer", descriptionKey: "achievement.6.desc", imagePath: "/achievements/Achievements 6.webp" },
  { id: 7, titleKey: "achievement.7.title", sectionKey: "achievement.section.cartographer", descriptionKey: "achievement.7.desc", imagePath: "/achievements/Achievements 7.webp" },
  { id: 8, titleKey: "achievement.8.title", sectionKey: "achievement.section.cartographer", descriptionKey: "achievement.8.desc", imagePath: "/achievements/Achievements 8.webp" },
  { id: 9, titleKey: "achievement.9.title", sectionKey: "achievement.section.cartographer", descriptionKey: "achievement.9.desc", imagePath: "/achievements/Achievements 9.webp" },

  // 💫 Раздел: Нити и связи (10–12)
  { id: 10, titleKey: "achievement.10.title", sectionKey: "achievement.section.threads", descriptionKey: "achievement.10.desc", imagePath: "/achievements/Achievements 10.webp" },
  { id: 11, titleKey: "achievement.11.title", sectionKey: "achievement.section.threads", descriptionKey: "achievement.11.desc", imagePath: "/achievements/Achievements 11.webp" },
  { id: 12, titleKey: "achievement.12.title", sectionKey: "achievement.section.threads", descriptionKey: "achievement.12.desc", imagePath: "/achievements/Achievements 12.webp" },

  // ❤️ Раздел: Избранное (13–14)
  { id: 13, titleKey: "achievement.13.title", sectionKey: "achievement.section.favorites", descriptionKey: "achievement.13.desc", imagePath: "/achievements/Achievements 13.webp" },
  { id: 14, titleKey: "achievement.14.title", sectionKey: "achievement.section.favorites", descriptionKey: "achievement.14.desc", imagePath: "/achievements/Achievements 14.webp" },

  // 📸 Раздел: Медиа (15–17)
  { id: 15, titleKey: "achievement.15.title", sectionKey: "achievement.section.media", descriptionKey: "achievement.15.desc", imagePath: "/achievements/Achievements 15.webp" },
  { id: 16, titleKey: "achievement.16.title", sectionKey: "achievement.section.media", descriptionKey: "achievement.16.desc", imagePath: "/achievements/Achievements 16.webp" },
  { id: 17, titleKey: "achievement.17.title", sectionKey: "achievement.section.media", descriptionKey: "achievement.17.desc", imagePath: "/achievements/Achievements 17.webp" },

  // 🎨 Раздел: Детали и стиль (18–20)
  { id: 18, titleKey: "achievement.18.title", sectionKey: "achievement.section.style", descriptionKey: "achievement.18.desc", imagePath: "/achievements/Achievements 18.webp" },
  { id: 19, titleKey: "achievement.19.title", sectionKey: "achievement.section.style", descriptionKey: "achievement.19.desc", imagePath: "/achievements/Achievements 19.webp" },
  { id: 20, titleKey: "achievement.20.title", sectionKey: "achievement.section.style", descriptionKey: "achievement.20.desc", imagePath: "/achievements/Achievements 20.webp" },

  // 📅 Раздел: Время и архив (21–24)
  { id: 21, titleKey: "achievement.21.title", sectionKey: "achievement.section.archive", descriptionKey: "achievement.21.desc", imagePath: "/achievements/Achievements 21.webp" },
  { id: 22, titleKey: "achievement.22.title", sectionKey: "achievement.section.archive", descriptionKey: "achievement.22.desc", imagePath: "/achievements/Achievements 22.webp" },
  { id: 23, titleKey: "achievement.23.title", sectionKey: "achievement.section.archive", descriptionKey: "achievement.23.desc", imagePath: "/achievements/Achievements 23.webp" },
  { id: 24, titleKey: "achievement.24.title", sectionKey: "achievement.section.archive", descriptionKey: "achievement.24.desc", imagePath: "/achievements/Achievements 24.webp" },

  // ✨ Раздел: Особые (25–30)
  { id: 25, titleKey: "achievement.25.title", sectionKey: "achievement.section.special", descriptionKey: "achievement.25.desc", imagePath: "/achievements/Achievements 25.webp" },
  { id: 26, titleKey: "achievement.26.title", sectionKey: "achievement.section.special", descriptionKey: "achievement.26.desc", imagePath: "/achievements/Achievements 26.webp" },
  { id: 27, titleKey: "achievement.27.title", sectionKey: "achievement.section.special", descriptionKey: "achievement.27.desc", imagePath: "/achievements/Achievements 27.webp" },
  { id: 28, titleKey: "achievement.28.title", sectionKey: "achievement.section.special", descriptionKey: "achievement.28.desc", imagePath: "/achievements/Achievements 28.webp" },
  { id: 29, titleKey: "achievement.29.title", sectionKey: "achievement.section.special", descriptionKey: "achievement.29.desc", imagePath: "/achievements/Achievements 29.webp" },
  { id: 30, titleKey: "achievement.30.title", sectionKey: "achievement.section.special", descriptionKey: "achievement.30.desc", imagePath: "/achievements/Achievements 30.webp" },
];

export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export type CheckerInput = {
  totalMemories: number;
  totalMedia: number;
  totalFavorites: number;
  totalThreads: number;
  memoriesWithGps: number;
  cities: Set<string>;
  countries: Set<string>;
  years: Set<string>;
  monthsByYear: Record<string, Set<number>>;
  usedSymbols: Set<string>;
  usedCustomColors: boolean;
  hasAvatar: boolean;
  hasName: boolean;
  hasVideo: boolean;
  hasDescription: boolean;
  maxMediaInMemory: number;
  locale: string;
};

export function buildCheckerData(
  memories: Memory[],
  threads: MemoryThread[],
  profile: { name: string; avatarPath: string | null; locale: string },
): CheckerInput & { threadWith5Plus: boolean } {
  const totalMemories = memories.length;
  let totalMedia = 0;
  let totalFavorites = 0;
  let hasVideo = false;
  let hasDescription = false;
  let maxMediaInMemory = 0;
  const cities = new Set<string>();
  const countries = new Set<string>();
  const years = new Set<string>();
  const monthsByYear: Record<string, Set<number>> = {};
  const usedSymbols = new Set<string>();
  let usedCustomColors = false;
  let memoriesWithGps = 0;

  for (const m of memories) {
    // Media count
    const mediaCount = m.media?.length || 0;
    totalMedia += mediaCount;
    if (m.image && m.image.startsWith("/api/")) {
      totalMedia += 1;
    }
    if (mediaCount > maxMediaInMemory) {
      maxMediaInMemory = mediaCount;
    }

    if (m.favorite) totalFavorites++;
    if (m.description) hasDescription = true;

    // Symbol
    if (m.symbol) usedSymbols.add(m.symbol);

    // Custom colour
    if (m.color && m.color !== "#ef766b") {
      usedCustomColors = true;
    }

    // Has GPS coordinates
    if (m.lat || m.lng) {
      memoriesWithGps++;
    }

    // Geo
    if (m.city) cities.add(m.city);
    if (m.country) countries.add(m.country);

    // Years / months
    if (m.year) years.add(m.year);
    if (m.date) {
      try {
        const d = new Date(m.date);
        const y = d.getFullYear().toString();
        const mo = d.getMonth();
        if (!monthsByYear[y]) monthsByYear[y] = new Set();
        monthsByYear[y].add(mo);
      } catch {
        // ignore
      }
    }
  }

  // Check video in media URLs
  for (const m of memories) {
    if (m.media?.some((url) => /\.(mp4|mov|webm|avi|mkv)$/i.test(url))) {
      hasVideo = true;
      break;
    }
  }

  // Thread with 5+ memories (for achievement 30)
  const threadWith5Plus = threads.some((t) => t.memoryIds.length >= 5);

  return {
    totalMemories,
    totalMedia,
    totalFavorites,
    totalThreads: threads.length,
    memoriesWithGps,
    cities,
    countries,
    years,
    monthsByYear,
    usedSymbols,
    usedCustomColors,
    hasAvatar: !!profile.avatarPath,
    hasName: !!profile.name?.trim(),
    hasVideo,
    hasDescription,
    maxMediaInMemory,
    locale: profile.locale || "en",
    threadWith5Plus,
  };
}

export function isAchievementUnlocked(
  achievementId: number,
  data: CheckerInput & { threadWith5Plus: boolean },
): boolean {
  switch (achievementId) {
    case 1:  return data.totalMemories >= 1;
    case 2:  return data.totalMedia >= 1;
    case 3:  return data.hasName;
    case 4:  return data.hasAvatar;
    case 5:  return data.memoriesWithGps >= 1;
    case 6:  return data.countries.size >= 3;
    case 7:  return data.cities.size >= 5;
    case 8:  return yearsSpan(data.years) >= 5;
    case 9:  return yearsSpan(data.years) >= 10;
    case 10: return data.totalThreads >= 1;
    case 11: return data.totalThreads >= 5;
    case 12: return data.totalThreads >= 10;
    case 13: return data.totalFavorites >= 1;
    case 14: return data.totalFavorites >= 5;
    case 15: return data.totalMedia >= 10;
    case 16: return data.totalMedia >= 50;
    case 17: return data.hasVideo;
    case 18: return data.usedSymbols.size >= 5;
    case 19: return data.usedCustomColors;
    case 20: return data.hasDescription;
    case 21: return hasAllMonths(data.monthsByYear);
    case 22: return data.totalMemories >= 25;
    case 23: return data.totalMemories >= 50;
    case 24: return data.totalMemories >= 100;
    case 25: return false; // tracked client-side via POST check
    case 26: return data.totalMemories >= 1;
    case 27: return data.locale !== "en";
    case 28: return data.maxMediaInMemory >= 5;
    case 29: return data.totalFavorites >= 10;
    case 30: return data.threadWith5Plus;
    default: return false;
  }
}

function yearsSpan(years: Set<string>): number {
  const nums = [...years].map(Number).filter(Number.isFinite);
  if (nums.length < 2) return nums.length;
  return Math.max(...nums) - Math.min(...nums) + 1;
}

function hasAllMonths(monthsByYear: Record<string, Set<number>>): boolean {
  return Object.values(monthsByYear).some((months) => months.size >= 12);
}
