"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [memories, setMemories] = useState<TimelineMemory[]>([]);
  const [active, setActive] = useState("all");
  const [mounted, setMounted] = useState(false);

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
  const yearCount = Math.max(years.length, 1);
  const step = yearCount > 1 ? 100 / (yearCount - 1) : 0;

  if (!mounted) {
    return (
      <footer className="timeline">
        <div className="timeline-head">
          <span>
            <strong>Timeline</strong> · your story over time
          </span>
          <span>memories</span>
        </div>
        <div className="timeline-track" />
      </footer>
    );
  }

  const choose = (year: string) => {
    setActive(year);
    window.dispatchEvent(new CustomEvent("life-trace-year", { detail: year }));
  };

  return (
    <footer className="timeline">
      <div className="timeline-head">
        <span>
          <strong>Timeline</strong> · your story over time
        </span>
        <span>
          {active === "all"
            ? `${memories.length} memories`
            : `Memories from ${active}`}
        </span>
      </div>
      <div className="timeline-track">
        {years.map((year, index) => (
          <button
            key={year}
            className={`timeline-event ${active === year ? "is-active" : ""}`}
            style={{ left: `${index * step}%` }}
            onClick={() => choose(year)}
          >
            <i />
            {year === "all" ? "All" : year}
          </button>
        ))}
      </div>
    </footer>
  );
}
