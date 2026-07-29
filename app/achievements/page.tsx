"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Lock,
  Medal,
  Trophy,
  Award,
} from "lucide-react";
import { ProfileLayout } from "@/shared/components/layout/ProfileLayout";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";
import type { AchievementWithStatus } from "@/lib/achievements/types";

const SECTIONS = [
  { key: "achievement.section.beginning", emoji: "🏁" },
  { key: "achievement.section.cartographer", emoji: "🗺️" },
  { key: "achievement.section.threads", emoji: "💫" },
  { key: "achievement.section.favorites", emoji: "❤️" },
  { key: "achievement.section.media", emoji: "📸" },
  { key: "achievement.section.style", emoji: "🎨" },
  { key: "achievement.section.archive", emoji: "📅" },
  { key: "achievement.section.special", emoji: "✨" },
];

export default function AchievementsPage() {
  const { t, locale } = useLocale();
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    try {
      // First check for new unlocks, then fetch full list
      const checkRes = await fetch("/api/achievements/check", { method: "POST" });
      if (checkRes.ok) {
        const { newlyUnlocked } = await checkRes.json();
        if (newlyUnlocked?.length) {
          window.dispatchEvent(
            new CustomEvent("life-trace-new-achievement", {
              detail: { achievements: newlyUnlocked },
            }),
          );
        }
      }
      const res = await fetch("/api/achievements");
      if (res.ok) {
        const data = await res.json();
        setAchievements(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAchievements();
  }, [fetchAchievements]);

  // Refresh on memory/thread/profile state changes
  useEffect(() => {
    const onState = () => void fetchAchievements();
    window.addEventListener("life-trace-memory-state", onState);
    return () => window.removeEventListener("life-trace-memory-state", onState);
  }, [fetchAchievements]);

  const grouped = useMemo(() => {
    const map = new Map<string, AchievementWithStatus[]>();
    for (const a of achievements) {
      const list = map.get(a.sectionKey) ?? [];
      list.push(a);
      map.set(a.sectionKey, list);
    }
    return map;
  }, [achievements]);

  const stats = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter((a) => a.unlocked).length;
    return { total, unlocked, pct: total > 0 ? Math.round((unlocked / total) * 100) : 0 };
  }, [achievements]);

  const sectionInfo = useMemo(() => {
    return SECTIONS.map((s) => ({
      ...s,
      sectionAchievements: grouped.get(s.key) ?? [],
      unlockedCount: (grouped.get(s.key) ?? []).filter((a) => a.unlocked).length,
      totalCount: (grouped.get(s.key) ?? []).length,
    }));
  }, [grouped]);

  return (
    <ProfileLayout>
      <div className="achievements-page">
        {/* Header */}
        <div className="achievements-hero">
          <div className="achievements-hero-icon">
            <Trophy size={36} />
          </div>
          <h1 className="achievements-title">{t("achievements.title")}</h1>
          <p className="achievements-subtitle">{t("achievements.subtitle")}</p>
        </div>

        {/* Overall progress bar */}
        <div className="achievements-progress-bar">
          <div
            className="achievements-progress-fill"
            style={{ width: `${stats.pct}%` }}
          />
          <span className="achievements-progress-text">
            <Medal size={13} />
            {stats.unlocked}/{stats.total}
          </span>
        </div>

        {loading && achievements.length === 0 && (
          <div className="achievements-loading">
            <Award size={24} />
            <p>{t("achievements.loading")}</p>
          </div>
        )}

        {!loading && achievements.length === 0 && (
          <div className="achievements-empty">
            <Award size={24} />
            <p>{t("achievements.empty")}</p>
          </div>
        )}

        {/* Sections */}
        {sectionInfo.map((section) => (
          <div key={section.key} className="achievements-section">
            <div className="achievements-section-header">
              <span className="achievements-section-emoji">{section.emoji}</span>
              <span className="achievements-section-title">
                {t(section.key)}
              </span>
              <span className="achievements-section-count">
                {section.unlockedCount}/{section.totalCount}
              </span>
            </div>
            {section.sectionAchievements.length === 0 && (
              <p className="achievements-empty-hint">{t("achievements.empty")}</p>
            )}
            <div className="achievements-grid">
              {section.sectionAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`achievement-card ${ach.unlocked ? "achievement-card--unlocked" : "achievement-card--locked"}`}
                >
                  <div className="achievement-card-image-wrap">
                    <img
                      src={ach.imagePath}
                      alt={t(ach.titleKey)}
                      className="achievement-card-image"
                      loading="lazy"
                    />
                    {!ach.unlocked && (
                      <div className="achievement-card-lock">
                        <Lock size={16} />
                      </div>
                    )}
                  </div>
                  <div className="achievement-card-body">
                    <strong className="achievement-card-title">
                      {t(ach.titleKey)}
                    </strong>
                    <p className="achievement-card-desc">
                      {t(ach.descriptionKey)}
                    </p>
                  </div>
                  {ach.unlocked && ach.unlockedAt && (
                    <time className="achievement-card-time">
                      {new Date(ach.unlockedAt).toLocaleDateString(
                        locale === "ru" ? "ru" : "en-GB",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </time>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ProfileLayout>
  );
}
