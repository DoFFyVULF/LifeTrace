"use client";

import { Heart, Plus, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo";
import { SettingsModal } from "@/shared/components/settings/SettingsModal";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";
import { isMediaSrc } from "@/lib/media";

type HeaderMemory = {
  id: string;
  title: string;
  place: string;
  date: string;
  color: string;
  image?: string;
  favorite?: boolean;
  city?: string;
  country?: string;
  tags?: string[];
};

const formatDate = (dateStr: string, locale: string = "en-GB") => {
  try {
    return new Date(dateStr).toLocaleDateString(
      locale === "ru" ? "ru" : "en-GB",
      { month: "long", day: "numeric", year: "numeric" },
    );
  } catch {
    return dateStr;
  }
};

export function Header() {
  const { t, locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [memories, setMemories] = useState<HeaderMemory[]>([]);
  const isProfile = pathname === "/profile";
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/memories");
      if (res.ok) setMemories(await res.json());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchMemories();
  }, [fetchMemories]);

  // Refresh on memory state changes
  useEffect(() => {
    const onState = () => void fetchMemories();
    window.addEventListener("life-trace-memory-state", onState);
    return () => window.removeEventListener("life-trace-memory-state", onState);
  }, [fetchMemories]);

  // Close search dropdown on outside click
  useEffect(() => {
    if (!searchQuery) return;
    const onClick = (e: MouseEvent) => {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node)
      ) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [searchQuery]);

  const matchesQuery = useCallback(
    (m: HeaderMemory, q: string) =>
      m.title.toLowerCase().includes(q) ||
      m.place.toLowerCase().includes(q) ||
      (m.city || "").toLowerCase().includes(q) ||
      (m.country || "").toLowerCase().includes(q) ||
      (m.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
    [],
  );

  const totalMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    return memories.filter((m) => matchesQuery(m, q)).length;
  }, [searchQuery, memories, matchesQuery]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return memories.filter((m) => matchesQuery(m, q)).slice(0, 5);
  }, [searchQuery, memories, matchesQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    window.dispatchEvent(
      new CustomEvent("life-trace-search", { detail: value }),
    );
  };

  const handleAdd = () => {
    if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("life-trace-add"));
    } else {
      sessionStorage.setItem("life-trace-queue-add", "1");
      router.push("/");
    }
  };

  return (
    <header className="app-header">
      <Logo />
      <div className="search-box-wrap" ref={searchWrapRef}>
        <label className="search-box">
          <span>&#x2315;</span>
          <input
            ref={searchRef}
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
                searchRef.current?.blur();
              }
            }}
          />
        </label>

        <AnimatePresence>
            {searchQuery && (
              <motion.div
                key="header-search-results"
                className="header-search-results"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {searchResults.length > 0 ? (
                  searchResults.map((memory, i) => (
                    <motion.button
                      key={memory.id}
                      className="header-search-card"
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: i * 0.03,
                        duration: 0.2,
                        ease: "easeOut",
                      }}
                      onClick={() => {
                        setSearchQuery("");
                        router.push(`/memory/${memory.id}`);
                      }}
                      whileHover={{ y: -1, scale: 1.005 }}
                      whileTap={{ scale: 0.98 }}
                      style={
                        {
                          "--card-color": memory.color,
                          "--card-image": isMediaSrc(memory.image)
                            ? `url("${memory.image}")`
                            : "none",
                        } as React.CSSProperties
                      }
                    >
                      <span className="header-search-card-art" />
                      <span className="header-search-card-body">
                        <strong className="header-search-card-title">
                          {memory.title}
                        </strong>
                        <span className="header-search-card-meta">
                          <span className="header-search-card-place">
                            {memory.place || memory.city || memory.country
                              ? [memory.city, memory.country]
                                  .filter(Boolean)
                                  .join(", ")
                              : t("constellation.unplaced")}
                          </span>
                          <span className="header-search-card-date">
                            {formatDate(memory.date, locale)}
                          </span>
                        </span>
                      </span>
                      {memory.favorite && (
                        <Heart
                          size={10}
                          fill="var(--coral)"
                          color="var(--coral)"
                        />
                      )}
                    </motion.button>
                  ))
                ) : (
                  <span className="header-search-empty">
                    {t("profile.search.empty")}
                  </span>
                )}
                {totalMatchCount > searchResults.length && (
                  <Link
                    href={`/search?q=${encodeURIComponent(searchQuery)}`}
                    className="header-search-show-all"
                    onClick={() => setSearchQuery("")}
                  >
                    {t("search.show.all")} ({totalMatchCount})
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
      </div>

      <div className="header-actions">
        <button className="add-button" onClick={handleAdd}>
          <Plus size={15} /> {t("add.memory")}
        </button>
        <button
          className="icon-button"
          aria-label={t("settings.button")}
          onClick={() => setSettingsOpen(true)}
        >
          <Settings size={16} />
        </button>
        <Link
          href="/profile"
          className="icon-button"
          aria-label={t("profile.title")}
        >
          <UserRound size={16} />
        </Link>
      </div>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </header>
  );
}
