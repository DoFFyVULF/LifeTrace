"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

type TimelineMemory = { id: string; date?: string; year?: string };

const extractYears = (memories: TimelineMemory[]) => {
  const yearSet = new Set<string>();
  for (const memory of memories) {
    const year =
      memory.year ||
      (memory.date ? memory.date.slice(0, 4) : "") ||
      "";
    if (/^\d{4}$/.test(year)) yearSet.add(year);
  }
  return Array.from(yearSet).sort((a, b) => a.localeCompare(b));
};

export function Timeline() {
  const { t } = useLocale();
  const [memories, setMemories] = useState<TimelineMemory[]>([]);
  const [active, setActive] = useState("all");
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fluidPct, setFluidPct] = useState(0); // continuous 0–100 during drag
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch("/api/memories");
      if (res.ok) {
        setMemories(await res.json());
      }
    } catch {
      // silently fall back to empty list
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void fetchMemories();

    const onState = (event: Event) => {
      const detail = (event as CustomEvent<TimelineMemory[]>).detail;
      if (Array.isArray(detail)) {
        setMemories(detail);
      } else {
        void fetchMemories();
      }
    };
    window.addEventListener("life-trace-memory-state", onState);
    return () => window.removeEventListener("life-trace-memory-state", onState);
  }, [fetchMemories]);

  const years = ["all", ...extractYears(memories)];
  const count = years.length;
  const activeIdx = Math.max(0, years.indexOf(active));

  /* Thumb position: follows pointer continuously during drag,
     sits on the active year otherwise. */
  const thumbPct =
    draggingRef.current
      ? fluidPct
      : count > 1
        ? (activeIdx / (count - 1)) * 100
        : 0;

  const select = useCallback(
    (y: string) => {
      if (y === active) return;
      setActive(y);
      window.dispatchEvent(new CustomEvent("life-trace-year", { detail: y }));
    },
    [active],
  );

  const yearAtX = useCallback(
    (clientX: number): { year: string | null; pct: number } => {
      if (!trackRef.current || count < 2) return { year: null, pct: 0 };
      const { left, width } = trackRef.current.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - left) / width));
      const idx = Math.round(frac * (count - 1));
      return { year: years[idx], pct: frac * 100 };
    },
    [years, count],
  );

  /* ── Pointer events on the track ─────────────────────────────── */

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (count < 2) return;
      const { year, pct } = yearAtX(e.clientX);
      setFluidPct(pct);
      if (year) select(year);
      draggingRef.current = true;
      setDragging(true);
      trackRef.current?.setPointerCapture(e.pointerId);
    },
    [yearAtX, select, count],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || count < 2) return;
      const { year, pct } = yearAtX(e.clientX);
      setFluidPct(pct);
      if (year && year !== active) select(year);
    },
    [yearAtX, select, count, active],
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
    // Snap to the nearest discrete year
    if (count > 1) {
      const snapIdx = Math.round(fluidPct / 100 * (count - 1));
      setFluidPct((snapIdx / (count - 1)) * 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, fluidPct]);

  /* ── Keyboard navigation ────────────────────────────────────── */

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (count < 2) return;
      const idx = years.indexOf(active);
      if (idx === -1) return;
      let next: string | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = years[Math.min(idx + 1, count - 1)];
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = years[Math.max(idx - 1, 0)];
      } else if (e.key === "Home") {
        next = years[0];
      } else if (e.key === "End") {
        next = years[count - 1];
      }
      if (next && next !== active) {
        e.preventDefault();
        select(next);
      }
    },
    [years, count, active, select],
  );

  /* ── Renders ────────────────────────────────────────────────── */

  if (!mounted) {
    return (
      <footer className="timeline">
        <div className="timeline-head">
          <span>
            <strong>{t("timeline.title")}</strong> · {t("timeline.subtitle")}
          </span>
          <span>{t("timeline.memories")}</span>
        </div>
        <div className="timeline-track" />
      </footer>
    );
  }

  /* Continuous distance for marker opacity — uses fluidPct during
     drag so pins fade smoothly between years. */
  const displayNorm = thumbPct / 100; // 0–1
  const maxDist = Math.max(count - 1, 1);

  return (
    <footer className="timeline">
      <div className="timeline-head">
        <span>
          <strong>{t("timeline.title")}</strong> · {t("timeline.subtitle")}
        </span>
        <span>
          {active === "all"
            ? `${memories.length} ${t("timeline.memories")}`
            : t("timeline.from", { year: active })}
        </span>
      </div>
      <div
        className={`timeline-track${dragging ? " is-dragging" : ""}`}
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Draggable thumb */}
        <button
          className="timeline-thumb"
          style={{ left: `${thumbPct}%` }}
          onKeyDown={onKeyDown}
          aria-label="Timeline scrubber"
          tabIndex={0}
        />

        {/* Year markers — continuous distance-based opacity/scale */}
        {years.map((year, i) => {
          const markerNorm = count > 1 ? i / (count - 1) : 0;
          const dist = Math.abs(markerNorm - displayNorm);

          return (
            <span
              key={year}
              className={`timeline-marker${year === active ? " is-active" : ""}`}
              style={{
                left: `${markerNorm * 100}%`,
                opacity: dist < 0.5 ? 1 : Math.max(0.15, 1 - dist * 1.8),
                transform: `translateX(-50%) scale(${dist < 0.5 ? 1 : Math.max(0.45, 1 - dist * 0.9)})`,
              }}
            >
              <i />
              {year === "all" ? t("timeline.all") : year}
            </span>
          );
        })}
      </div>
    </footer>
  );
}
