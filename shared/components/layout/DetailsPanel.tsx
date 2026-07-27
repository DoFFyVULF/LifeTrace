"use client";

import { CalendarDays, Image, Link2, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

type NoteMemory = {
  id: string;
  title: string;
  date: string;
  media?: string[];
  favorite?: boolean;
};
type Thread = { id: string; memoryIds: string[] };

export function DetailsPanel() {
  const { t, locale } = useLocale();
  const [memories, setMemories] = useState<NoteMemory[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [memoriesRes, threadsRes] = await Promise.all([
        fetch("/api/memories"),
        fetch("/api/threads"),
      ]);
      if (memoriesRes.ok) setMemories(await memoriesRes.json());
      if (threadsRes.ok) setThreads(await threadsRes.json());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const onState = () => void fetchData();
    window.addEventListener("life-trace-memory-state", onState);
    return () => window.removeEventListener("life-trace-memory-state", onState);
  }, [fetchData]);

  const latest = useMemo(
    () => [...memories].sort((a, b) => b.date.localeCompare(a.date))[0],
    [memories],
  );
  const moments = memories.reduce(
    (sum, memory) => sum + (memory.media?.length || 0),
    0,
  );
  const connected = threads[0]?.memoryIds.length
    ? threads[0].memoryIds.length - 1
    : 0;
  const viewConnections = () =>
    window.dispatchEvent(new CustomEvent("life-trace-show-threads"));

  return (
    <aside className="details-panel">
      <div className="archive-notes-head">
        <span className="panel-label">{t("details.archive.notes")}</span>
        <button aria-label="Archive notes menu" className="notes-menu">
          <MoreHorizontal size={17} />
        </button>
      </div>
      <h2>{t("details.at.a.glance")}</h2>
      <div className="notes-stats">
        <div className="note-stat">
          <CalendarDays size={16} />
          <span>
            {t("details.last.memory")}
            <br />
            <strong>
              {latest
                ? new Date(latest.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : t("details.no.memories")}
            </strong>
          </span>
        </div>
        <div className="note-stat note-stat--mint">
          <Image size={16} />
          <span>
            {t("details.photos.collected")}
            <br />
            <strong>{moments} {t("details.photos.value")}</strong>
          </span>
        </div>
      </div>
      <div className="notes-divider" />
      <span className="panel-label">{t("details.connected.story")}</span>
      <p>
        {connected
          ? locale === "ru"
            ? `Ваша ${latest?.title || "история"} связана с ${connected} другим${connected > 1 ? "и" : ""} воспоминани${connected > 1 ? "ями" : "ем"}.`
            : `${latest?.title || "Story"} connects to ${connected} other ${connected === 1 ? "memory" : "memories"}.`
          : t("details.connected.empty")}
      </p>
      <button className="view-connections" onClick={viewConnections}>
        <Link2 size={14} /> {t("details.view.connections")}
      </button>
    </aside>
  );
}
