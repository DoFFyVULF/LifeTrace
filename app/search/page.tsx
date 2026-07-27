"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Heart, MapPin, SearchIcon } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";
import { isMediaSrc } from "@/lib/media";

type SearchMemory = {
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
  _matchTags?: string[];
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

function SearchResults() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [memories, setMemories] = useState<SearchMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      const res = await fetch(`/api/memories${params.toString() ? `?${params}` : ""}`);
      if (res.ok) setMemories(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void fetchMemories();
  }, [fetchMemories]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return memories
      .filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.place.toLowerCase().includes(q) ||
          (m.city || "").toLowerCase().includes(q) ||
          (m.country || "").toLowerCase().includes(q) ||
          (m.tags ?? []).some((tag) => tag.toLowerCase().includes(q)),
      )
      .map((m) => ({
        ...m,
        _matchTags:
          (m.tags ?? []).filter((tag) => tag.toLowerCase().includes(q)),
      }));
  }, [query, memories]);

  return (
    <section className="search-page-body">
      <div className="search-page-head">
        <span className="eyebrow">
          <SearchIcon size={12} /> {t("search.page.title")}
        </span>
        {query && (
          <h1>
            {results.length} {t("search.page.results")} &ldquo;{query}&rdquo;
          </h1>
        )}
      </div>

      {loading ? (
        <div className="search-page-loading">
          <span className="search-spinner" />
        </div>
      ) : results.length > 0 ? (
        <div className="search-page-list">
          {results.map((memory) => (
            <Link
              key={memory.id}
              href={`/memory/${memory.id}`}
              className="search-page-card"
              style={
                {
                  "--card-color": memory.color,
                  "--card-image": isMediaSrc(memory.image)
                    ? `url("${memory.image}")`
                    : "none",
                } as React.CSSProperties
              }
            >
              <span className="search-page-card-art" />
              <span className="search-page-card-body">
                <strong className="search-page-card-title">
                  {memory.title}
                </strong>
                <span className="search-page-card-meta">
                  <span className="search-page-card-place">
                    <MapPin size={10} />
                    {memory.place || memory.city || memory.country
                      ? [memory.city, memory.country].filter(Boolean).join(", ")
                      : t("constellation.unplaced")}
                  </span>
                  <span className="search-page-card-date">
                    <CalendarDays size={10} />
                    {formatDate(memory.date, locale)}
                  </span>
                </span>
                {memory.tags && memory.tags.length > 0 && (
                  <span className="search-page-card-tags">
                    {memory.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`tag-chip ${(memory._matchTags ?? []).includes(tag) ? "tag-chip--match" : ""}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              {memory.favorite && (
                <Heart
                  size={12}
                  fill="var(--coral)"
                  color="var(--coral)"
                />
              )}
            </Link>
          ))}
        </div>
      ) : query ? (
        <div className="search-page-empty">
          <SearchIcon size={24} />
          <p>{t("search.no.results")} &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="search-page-empty">
          <SearchIcon size={24} />
          <p>{t("search.no.results")}</p>
        </div>
      )}
    </section>
  );
}

export default function SearchPage() {
  const { t } = useLocale();

  return (
    <main className="search-page">
      <header className="search-page-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> {t("memory.back")}
        </Link>
      </header>
      <Suspense fallback={
        <section className="search-page-body">
          <div className="search-page-loading">
            <span className="search-spinner" />
          </div>
        </section>
      }>
        <SearchResults />
      </Suspense>
    </main>
  );
}
