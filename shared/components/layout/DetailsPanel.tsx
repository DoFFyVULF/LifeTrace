"use client";

import { CalendarDays, Image, Link2, MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type NoteMemory = {
  id: string;
  title: string;
  date: string;
  media?: string[];
  favorite?: boolean;
};
type Thread = { id: string; memoryIds: string[] };

export function DetailsPanel() {
  const [memories, setMemories] = useState<NoteMemory[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  useEffect(() => {
    const read = () => {
      try {
        setMemories(
          JSON.parse(localStorage.getItem("life-trace-memories") || "[]"),
        );
        setThreads(
          JSON.parse(localStorage.getItem("life-trace-threads") || "[]"),
        );
      } catch {
        setMemories([]);
        setThreads([]);
      }
    };
    read();
    window.addEventListener("life-trace-memory-state", read);
    return () => window.removeEventListener("life-trace-memory-state", read);
  }, []);
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
        <span className="panel-label">Archive notes</span>
        <button aria-label="Archive notes menu" className="notes-menu">
          <MoreHorizontal size={17} />
        </button>
      </div>
      <h2>At a glance</h2>
      <div className="notes-stats">
        <div className="note-stat">
          <CalendarDays size={16} />
          <span>
            Last memory
            <br />
            <strong>
              {latest
                ? new Date(latest.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "No memories yet"}
            </strong>
          </span>
        </div>
        <div className="note-stat note-stat--mint">
          <Image size={16} />
          <span>
            Photos collected
            <br />
            <strong>{moments} moments</strong>
          </span>
        </div>
      </div>
      <div className="notes-divider" />
      <span className="panel-label">Connected story</span>
      <p>
        {connected
          ? `Your ${latest?.title || "story"} connects to ${connected} other memor${connected === 1 ? "y" : "ies"}.`
          : "Connect memories to reveal the story between them."}
      </p>
      <button className="view-connections" onClick={viewConnections}>
        <Link2 size={14} /> View connections
      </button>
    </aside>
  );
}
