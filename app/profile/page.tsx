"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Camera,
  Heart,
  Image as ImageIcon,
  Layers,
  MapPin,
  Trophy,
} from "lucide-react";
import type { Memory, MemoryThread } from "@/features/map/components/MapCanvas";
import { ProfileLayout } from "@/shared/components/layout/ProfileLayout";
import { prepareUpload, uploadMedia } from "@/lib/media";
import { reverseGeocode } from "@/lib/geocode";
import { ConstellationTimeline } from "@/features/profile/components/ConstellationTimeline";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

type ProfileData = {
  name: string;
  avatarPath: string | null;
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const RANK_KEY = [
  { min: 0, key: "profile.rank.beginner", icon: "🌱" },
  { min: 1, key: "profile.rank.storyteller", icon: "📖" },
  { min: 5, key: "profile.rank.keeper", icon: "🗂️" },
  { min: 20, key: "profile.rank.master", icon: "🏛️" },
  { min: 50, key: "profile.rank.chronicler", icon: "📜" },
] as const;

function getRankT(count: number) {
  let rank: (typeof RANK_KEY)[number] = RANK_KEY[0];
  for (const r of RANK_KEY) {
    if (count >= r.min) rank = r;
  }
  return rank;
}

export default function ProfilePage() {
  const { t, locale } = useLocale();
  const [profile, setProfile] = useState<ProfileData>({ name: "", avatarPath: null });
  const [memories, setMemories] = useState<Memory[]>([]);
  const [threads, setThreads] = useState<MemoryThread[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile({ name: data.name || "", avatarPath: data.avatarPath || null });
      }
    } catch {
      // silent
    }
  }, []);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/memories");
      if (res.ok) setMemories(await res.json());
    } catch {
      // silent
    }
  }, []);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/threads");
      if (res.ok) setThreads(await res.json());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
    void fetchMemories();
    void fetchThreads();
    const onState = () => {
      void fetchMemories();
      void fetchThreads();
    };
    window.addEventListener("life-trace-memory-state", onState);
    return () => window.removeEventListener("life-trace-memory-state", onState);
  }, [fetchProfile, fetchMemories, fetchThreads]);

  // Re‑geocode all memories when locale changes so city/country reflect the current language
  useEffect(() => {
    if (!memories.length) return;
    let cancelled = false;
    void (async () => {
      const updated = await Promise.all(
        memories.map(async (m) => {
          if (!m.lat || !m.lng) return null;
          const geo = await reverseGeocode(m.lat, m.lng, locale).catch(() => null);
          if (!geo) return null;
          const newCity = geo.city || m.city;
          const newCountry = geo.country || m.country;
          if (newCity === m.city && newCountry === m.country) return null;
          // Persist to API
          fetch(`/api/memories/${m.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: newCity, country: newCountry }),
          }).catch(() => {});
          return { ...m, city: newCity, country: newCountry };
        }),
      );
      if (cancelled) return;
      const patched = updated.filter(Boolean) as Memory[];
      if (patched.length) setMemories((prev) =>
        prev.map((m) => patched.find((p) => p.id === m.id) ?? m),
      );
    })();
    return () => { cancelled = true; };
  }, [locale]);

  const stats = useMemo(() => {
    const totalMemories = memories.length;
    const totalPhotos = memories.reduce(
      (sum, m) => sum + (m.media?.length || 1),
      0,
    );
    const favorites = memories.filter((m) => m.favorite).length;
    const activeYears = new Set(memories.map((m) => m.year).filter(Boolean))
      .size;
    const totalThreads = threads.length;

    const sorted = [...memories].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = sorted[0]?.date;
    const lastDate = sorted[sorted.length - 1]?.date;
    const spanYears =
      firstDate && lastDate
        ? Math.max(
            1,
            new Date(lastDate).getFullYear() -
              new Date(firstDate).getFullYear() +
              1,
          )
        : 0;

    return {
      totalMemories,
      totalPhotos,
      favorites,
      activeYears,
      totalThreads,
      firstDate,
      lastDate,
      spanYears,
    };
  }, [memories, threads]);

  const years = useMemo(() => {
    const available = Array.from(
      new Set(memories.map((memory) => new Date(memory.date).getFullYear()).filter(Number.isFinite)),
    ).sort((a, b) => b - a);
    const currentYear = new Date().getFullYear();
    return available.includes(currentYear) ? available : [currentYear, ...available];
  }, [memories]);

  useEffect(() => {
    if (!years.includes(selectedYear)) setSelectedYear(years[0] ?? new Date().getFullYear());
  }, [selectedYear, years]);

  const rank = useMemo(() => getRankT(stats.totalMemories), [stats.totalMemories]);

  const initials = useMemo(() => {
    const name = profile.name?.trim();
    if (!name) return "LT";
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [profile.name]);

  const avatarStyle = profile.avatarPath
    ? {
        backgroundImage: `url(${profile.avatarPath})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  const handleAvatarUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { blob, name } = await prepareUpload(file);
        const url = await uploadMedia(blob, name);
        const next = { ...profile, avatarPath: url };
        setProfile(next);
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarPath: url }),
        });
      } catch {
        // silent
      }
    };
    input.click();
  }, [profile]);

  const saveName = async () => {
    setProfile((prev) => ({ ...prev, name: nameDraft }));
    setEditingName(false);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft }),
      });
    } catch {
      // silent
    }
  };

  return (
    <ProfileLayout>
    <div className="profile-page">
      {/* Avatar - big and centered */}
      <div className="profile-hero">
        <button
          className="profile-avatar profile-avatar--large"
          onClick={handleAvatarUpload}
          style={avatarStyle}
          aria-label={t("profile.upload.avatar")}
        >
          {!profile.avatarPath && (
            <span className="profile-initials">{initials}</span>
          )}
          <span className="profile-avatar-overlay">
            <Camera size={24} />
          </span>
        </button>
        <div className="profile-name-section">
          {editingName ? (
            <input
              autoFocus
              className="profile-name-input profile-name-input--centered"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditingName(false);
              }}
              placeholder={t("profile.your.name")}
            />
          ) : (
            <h1 className="profile-name profile-name--centered" onClick={() => { setNameDraft(profile.name || ""); setEditingName(true); }}>
              {profile.name || t("profile.default.name")}
            </h1>
          )}
          <span className="profile-rank">
            <Trophy size={14} />
            {t(rank.key)}
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="profile-section">
        <span className="eyebrow">{t("profile.statistics")}</span>
        <div className="profile-stats">
          <div className="profile-stat">
            <div
              className="profile-stat-icon"
              style={{ background: "#f6d9d5", color: "#b33e48" }}
            >
              <ImageIcon size={16} />
            </div>
            <div className="profile-stat-body">
              <strong>{stats.totalMemories}</strong>
              <span>{t("profile.memories")}</span>
            </div>
          </div>
          <div className="profile-stat">
            <div
              className="profile-stat-icon"
              style={{ background: "#d5e3dd", color: "#3f7a5f" }}
            >
              <Camera size={16} />
            </div>
            <div className="profile-stat-body">
              <strong>{stats.totalPhotos}</strong>
              <span>{t("profile.photos")}</span>
            </div>
          </div>
          <div className="profile-stat">
            <div
              className="profile-stat-icon"
              style={{ background: "#f0dbd0", color: "#b3714a" }}
            >
              <Heart size={16} />
            </div>
            <div className="profile-stat-body">
              <strong>{stats.favorites}</strong>
              <span>{t("profile.favorites")}</span>
            </div>
          </div>
          <div className="profile-stat">
            <div
              className="profile-stat-icon"
              style={{ background: "#d5d5e3", color: "#5b5b8a" }}
            >
              <Layers size={16} />
            </div>
            <div className="profile-stat-body">
              <strong>{stats.totalThreads}</strong>
              <span>{t("profile.threads")}</span>
            </div>
          </div>
          <div className="profile-stat">
            <div
              className="profile-stat-icon"
              style={{ background: "#d9e0c5", color: "#6f7d3a" }}
            >
              <CalendarDays size={16} />
            </div>
            <div className="profile-stat-body">
              <strong>{stats.activeYears}</strong>
              <span>{t("profile.active.years")}</span>
            </div>
          </div>
          <div className="profile-stat">
            <div
              className="profile-stat-icon"
              style={{ background: "#e0d4c5", color: "#8a6e4a" }}
            >
              <MapPin size={16} />
            </div>
            <div className="profile-stat-body">
              <strong>
                {stats.spanYears > 0
                  ? `${stats.spanYears} ${stats.spanYears > 1 ? t("profile.span.years") : t("profile.span.year")}`
                  : "—"}
              </strong>
              <span>{t("profile.journey.span")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date range */}
      {stats.firstDate && (
        <div className="profile-date-range">
          <CalendarDays size={14} />
          <span className="profile-date-range-text">
            <strong>{formatDate(stats.firstDate)}</strong>
            {" — "}
            <strong>{formatDate(stats.lastDate!)}</strong>
          </span>
          <span className="profile-date-range-label">{t("profile.journey.so.far")}</span>
        </div>
      )}

      {/* Constellation timeline */}
      {memories.length > 0 && (
        <ConstellationTimeline
          memories={memories}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          onChangeYear={setSelectedYear}
          years={years}
        />
      )}

      {/* Empty state */}
      {memories.length === 0 && (
        <div className="profile-empty">
          <MapPin size={24} />
          <p>{t("profile.no.memories")}</p>
          <small>
            {t("profile.no.memories.hint")}
          </small>
        </div>
      )}
    </div>
    </ProfileLayout>
  );
}
