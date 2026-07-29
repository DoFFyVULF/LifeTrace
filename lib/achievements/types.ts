export interface Achievement {
  id: number;
  titleKey: string;
  sectionKey: string;
  descriptionKey: string;
  imagePath: string;
}

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlockedAt: string | null;
}

export type CheckerData = {
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
  hasImportedGps: boolean;
  maxMediaInMemory: number;
  profile: ProfileData;
};

export type ProfileData = {
  name: string;
  avatarPath: string | null;
};
