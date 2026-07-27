"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { isMediaSrc } from "@/lib/media";
import type { Memory } from "@/features/map/components/MapCanvas";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

// ─── helpers ────────────────────────────────────────────────

/** Translation keys for each month: [fullNameKey, shortNameKey]. */
const MONTH_KEYS: [string, string][] = [
  ["month.january", "month.jan"],
  ["month.february", "month.feb"],
  ["month.march", "month.mar"],
  ["month.april", "month.apr"],
  ["month.may", "month.may.short"],
  ["month.june", "month.jun"],
  ["month.july", "month.jul"],
  ["month.august", "month.aug"],
  ["month.september", "month.sep"],
  ["month.october", "month.oct"],
  ["month.november", "month.nov"],
  ["month.december", "month.dec"],
];

/** Return a 5-pointed star polygon points string for an SVG. */
function starPoints(cx: number, cy: number, r: number): string {
  const ir = r * 0.4;
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI / 2) * -1 + (i * 2 * Math.PI) / 5;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
    const b = a + Math.PI / 5;
    pts.push(`${cx + ir * Math.cos(b)},${cy + ir * Math.sin(b)}`);
  }
  return pts.join(" ");
}

/** Clamp a value between min/max. */
const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/** Y‑offsets for each month (percentage). */
const ROUTE_TOPS = [61, 47, 40, 52, 72, 54, 41, 53, 75, 43, 27, 38] as const;

/** Build the SVG path through each month's anchor point, up to maxIndex (inclusive). */
function buildPath(
  w: number,
  h: number,
  tops: readonly number[],
  maxIndex: number,
): string {
  const count = Math.min(tops.length, maxIndex + 1);
  const step = w / (tops.length + 1);
  const points = tops.slice(0, count).map((t, i) => ({
    x: step * (i + 1),
    y: (t / 100) * h,
  }));

  if (points.length === 0) return "";
  if (points.length === 1)
    return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const cp1x = prev.x + (cur.x - prev.x) * 0.3;
    const cp1y = cur.y;
    const cp2x = cur.x - (next.x - cur.x) * 0.3;
    const cp2y = cur.y;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  // straight segment to the last point
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  d += ` C ${prev.x + (last.x - prev.x) * 0.3} ${last.y}, ${last.x} ${last.y}, ${last.x} ${last.y}`;
  return d;
}

/** Scatter random background stars — stable across renders via seeded hash. */
function seededHash(seed: number) {
  let h = seed;
  return () => {
    h = (h * 16807 + 0) % 2147483647;
    return (h & 0x7fffffff) / 0x7fffffff;
  };
}
function backgroundStars(
  count: number,
  seed: number,
): { x: number; y: number; r: number; o: number; d: number }[] {
  const rng = seededHash(seed);
  const out: ReturnType<typeof backgroundStars> = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: rng() * 100,
      y: rng() * 100,
      r: 0.8 + rng() * 1.2,
      o: 0.08 + rng() * 0.14,
      d: 3 + rng() * 5,
    });
  }
  return out;
}

const BG_STARS = backgroundStars(30, 42);

// ─── component ──────────────────────────────────────────────

type Props = {
  memories: Memory[];
  selectedYear: number;
  selectedMonth: number | null;
  onSelectMonth: (index: number | null) => void;
  onChangeYear: (year: number) => void;
  years: number[];
};

export function ConstellationTimeline({
  memories,
  selectedYear,
  selectedMonth,
  onSelectMonth,
  onChangeYear,
  years,
}: Props) {
  const router = useRouter();
  const { t, locale } = useLocale();
  const dateLocale = locale === "ru" ? "ru" : "en-GB";
  const canvasRef = useRef<HTMLDivElement>(null);
  const [clientReady, setClientReady] = useState(false);

  // Only use real Date() after client hydration to avoid SSR mismatch
  useEffect(() => { setClientReady(true); }, []);

  // Reactive month data — rebuilds when locale changes
  const monthData = useMemo(
    () =>
      MONTH_KEYS.map(([labelKey, shortKey], index) => ({
        index,
        label: t(labelKey),
        short: t(shortKey),
      })),
    [t],
  );

  // memories grouped and sorted per month
  const memoriesByMonth = monthData.map(({ index }) =>
    memories
      .filter((m) => {
        const d = new Date(m.date);
        return d.getFullYear() === selectedYear && d.getMonth() === index;
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
  );

  const monthCounts = memoriesByMonth.map((m) => m.length);
  const maxCount = Math.max(...monthCounts, 1);

  const selectedMemories =
    selectedMonth === null ? [] : memoriesByMonth[selectedMonth];

  // Store SVG dimensions for path building
  const [svgSize, setSvgSize] = useState({ w: 1200, h: 300 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSvgSize({ w: Math.max(width, 200), h: Math.max(height, 200) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Determine how far the timeline path reaches
  // During SSR/static build, use a sentinel future date so ALL years get full path.
  // After client hydration, use the real date.
  const now = clientReady ? new Date() : new Date(9999, 11, 31);
  const maxMemoryYear = Math.max(
    ...memories.map((m) => new Date(m.date).getFullYear()).filter(Number.isFinite),
    0,
  );
  const effectiveCurrentYear = Math.max(now.getFullYear(), maxMemoryYear);
  const isCurrentYear = selectedYear === effectiveCurrentYear;

  // Find the last month that actually has memories (reliable ground truth)
  let lastMemoryMonth = -1;
  for (let i = 11; i >= 0; i--) {
    if (monthCounts[i] > 0) {
      lastMemoryMonth = i;
      break;
    }
  }

  // Path always covers at least what memories exist.
  // For current year it also covers up to the current calendar month.
  // For past years it covers all 12 months regardless of memory placement.
  const lastPathMonth = isCurrentYear
    ? Math.min(Math.max(now.getMonth(), lastMemoryMonth), 11)
    : 11;

  const pathD = buildPath(svgSize.w, svgSize.h, [...ROUTE_TOPS], lastPathMonth);

  // scroll selected month into view
  useEffect(() => {
    if (selectedMonth !== null) {
      const id = `constellation-marker-${selectedMonth}`;
      const marker = document.getElementById(id);
      if (marker) {
        setTimeout(() => {
          marker.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }, 100);
      }
    }
  }, [selectedMonth]);

  const handleSelectMonth = (index: number) => {
    onSelectMonth(selectedMonth === index ? null : index);
  };

  return (
    <section className="constellation" aria-labelledby="constellation-title">
      {/* Header */}
      <div className="constellation-head">
        <div>
          <span className="eyebrow">{t("constellation.eyebrow")}</span>
          <h2 id="constellation-title">{t("constellation.title", { year: selectedYear })}</h2>
        </div>
        <div
          className="constellation-year"
          aria-label={t("constellation.choose.year")}
        >
          <button
            aria-label={t("constellation.prev.year")}
            disabled={
              years.indexOf(selectedYear) === years.length - 1
            }
            onClick={() => {
              onSelectMonth(null);
              onChangeYear(
                years[years.indexOf(selectedYear) + 1],
              );
            }}
          >
            <ChevronLeft size={15} />
          </button>
          <span>{selectedYear}</span>
          <button
            aria-label={t("constellation.next.year")}
            disabled={years.indexOf(selectedYear) === 0}
            onClick={() => {
              onSelectMonth(null);
              onChangeYear(
                years[years.indexOf(selectedYear) - 1],
              );
            }}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <p className="constellation-summary">
        <span>
          {memoriesByMonth.reduce(
            (total, month) => total + month.length,
            0,
          )}{" "}
          {t("constellation.moments.kept")}
        </span>
        <i />
        <span>{isCurrentYear ? t("constellation.months.charted", { count: lastPathMonth + 1 }) : t("constellation.months.charted.full")}</span>
      </p>

      {/* Canvas */}
      <div className="constellation-canvas" ref={canvasRef}>
        {/* Background twinkling stars */}
        <div className="constellation-bg" aria-hidden="true">
          {BG_STARS.map((s, i) => (
            <span
              key={i}
              className="constellation-bg-star"
              style={
                {
                  "--star-x": `${s.x}%`,
                  "--star-y": `${s.y}%`,
                  "--star-r": `${s.r}px`,
                  "--star-o": s.o,
                  "--star-d": `${s.d}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {/* SVG path + stars */}
        <svg
          className="constellation-svg"
          viewBox={`0 0 ${svgSize.w} ${svgSize.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Glow behind the path */}
          <path
            className="constellation-path-glow"
            d={pathD}
            pathLength={1200}
          />
          {/* Main constellation path */}
          <path className="constellation-path" d={pathD} pathLength={1200} />
        </svg>

        {/* Month markers */}
        {monthData.map((month, index) => {
          const count = monthCounts[index];
          const stepX = svgSize.w / (monthData.length + 1);
          const left = stepX * (index + 1);
          const top = (ROUTE_TOPS[index] / 100) * svgSize.h;
          const starSize = clamp(
            14 + (count / maxCount) * 14,
            14,
            28,
          );
          const isSelected = selectedMonth === index;
          const hasMemories = count > 0;
          // A month is beyond the path if it's past the path end AND has no memories
          const isBeyondPath = index > lastPathMonth && !hasMemories;

          return (
            <button
              key={month.index}
              id={`constellation-marker-${index}`}
              className={`constellation-star ${isSelected ? "is-active" : ""} ${hasMemories ? "has-memories" : ""} ${isBeyondPath ? "is-beyond-path" : ""}`}
              style={
                {
                  "--star-left": `${(left / svgSize.w) * 100}%`,
                  "--star-top": `${(top / svgSize.h) * 100}%`,
                  "--star-size": `${starSize}px`,
                  "--route-index": index,
                  "--star-glow": hasMemories
                    ? "rgba(239, 118, 107, 0.4)"
                    : "rgba(113, 129, 123, 0.2)",
                  "--glow-mult": isSelected ? "3" : "1",
                } as React.CSSProperties
              }
              aria-label={t("constellation.aria.month", { month: month.label, count, label: count === 1 ? t("constellation.label.moment") : t("constellation.label.moments") })}
              aria-expanded={isSelected}
              disabled={isBeyondPath}
              onClick={() => handleSelectMonth(index)}
            >
              {/* Glow aura */}
              <span className="constellation-star-aura" />
              {/* Star shape */}
              <svg
                className="constellation-star-shape"
                viewBox="0 0 60 60"
                aria-hidden="true"
                width={starSize}
                height={starSize}
              >
                <polygon
                  points={starPoints(30, 30, 28)}
                  fill={
                    isBeyondPath
                      ? "#d5dbd6"
                      : isSelected
                        ? "var(--coral)"
                        : hasMemories
                          ? "var(--ink)"
                          : "#bcc8be"
                  }
                />
              </svg>
              {/* Orbiting spark */}
              {hasMemories && !isBeyondPath && (
                <span className="constellation-spark" />
              )}
              {/* Label */}
              <span className="constellation-star-label">
                {month.short}
              </span>
              <span className="constellation-star-count">
                {count || "—"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Drawer */}
      <div
        className={`constellation-drawer ${selectedMonth !== null ? "is-open" : ""}`}
        aria-live="polite"
      >
        {selectedMonth !== null && (
          <div className="constellation-drawer-inner">
            {/* Drawer header */}
            <div className="constellation-drawer-title">
              <div>
                <span className="eyebrow">
                  {t("constellation.chapter", { num: String(selectedMonth + 1).padStart(2, "0") })} /{" "}
                  {selectedYear}
                </span>
                <h3>{monthData[selectedMonth].label}</h3>
              </div>
              <button
                className="constellation-close"
                onClick={() => onSelectMonth(null)}
                aria-label={t("constellation.close.month")}
              >
                <ChevronDown size={17} />
              </button>
            </div>

            {/* Memories */}
            {selectedMemories.length > 0 ? (
              <>
                <div className="constellation-moments">
                  {selectedMemories.slice(0, 6).map((memory, i) => (
                    <button
                      key={memory.id}
                      className="constellation-moment"
                      style={
                        {
                          "--moment-i": i,
                          "--moment-image": isMediaSrc(memory.image)
                            ? `url("${memory.image}")`
                            : "none",
                          "--moment-color": memory.color,
                        } as React.CSSProperties
                      }
                      onClick={() =>
                        router.push(`/memory/${memory.id}`)
                      }
                    >
                      <span className="constellation-moment-art" />
                      <span className="constellation-moment-body">
                        <strong>{memory.title}</strong>
                        <small>
                          {memory.place || t("constellation.unplaced")}
                        </small>
                        <small className="moment-coords">
                          {memory.city || memory.country
                            ? [memory.city, memory.country].filter(Boolean).join(", ")
                            : `${memory.lat.toFixed(2)}° · ${memory.lng.toFixed(2)}°`}
                        </small>
                      </span>
                      <time>
                        {new Date(memory.date).toLocaleDateString(
                          dateLocale,
                          { day: "numeric", month: "short" },
                        )}
                      </time>
                    </button>
                  ))}
                </div>
                {selectedMemories.length > 6 && (
                  <button
                    className="constellation-all"
                    onClick={() =>
                      router.push(
                        `/memories/${selectedYear}/${selectedMonth + 1}`,
                      )
                    }
                  >
                    {t("constellation.see.all", { count: selectedMemories.length, month: monthData[selectedMonth].label })}
                    <ChevronRight size={15} />
                  </button>
                )}
              </>
            ) : (
              <p className="constellation-empty">
                {t("constellation.empty")}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
