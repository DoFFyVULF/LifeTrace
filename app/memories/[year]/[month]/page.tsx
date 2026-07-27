"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Memory } from "@/features/map/components/MapCanvas";
import { ProfileLayout } from "@/shared/components/layout/ProfileLayout";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

export default function MonthArchivePage() {
  const { t } = useLocale();
  const { year, month } = useParams<{ year: string; month: string }>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const monthIndex = Number(month) - 1;
  const heading = useMemo(() => {
    if (monthIndex < 0 || monthIndex > 11) return t("archive.month");
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(Number(year), monthIndex, 1));
  }, [monthIndex, year, t]);

  useEffect(() => {
    void fetch("/api/memories").then((res) => res.ok ? res.json() : []).then(setMemories).catch(() => setMemories([]));
  }, []);

  const shown = memories.filter((memory) => {
    const date = new Date(memory.date);
    return date.getFullYear() === Number(year) && date.getMonth() === monthIndex;
  }).sort((a, b) => b.date.localeCompare(a.date));

  return <ProfileLayout><main className="month-archive">
    <Link href="/profile" className="back-link"><ArrowLeft size={16} /> {t("archive.back")}</Link>
    <header className="month-archive-head"><span className="eyebrow">{t("archive.title")}</span><h1>{heading}</h1><p>{shown.length ? `${shown.length} ${shown.length === 1 ? t("archive.memory") : t("archive.memories")} from this chapter.` : t("archive.empty")}</p></header>
    <section className="month-archive-list" aria-label={`${t("archive.title")} — ${heading}`}>
      {shown.map((memory) => <Link key={memory.id} href={`/memory/${memory.id}`} className="month-archive-memory">
        <span className="month-archive-dot" style={{ background: memory.color }} />
        <span><strong>{memory.title}</strong><small><MapPin size={12} /> {memory.place || t("sidebar.unplaced")}</small></span>
        <time><CalendarDays size={13} /> {new Date(memory.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</time>
      </Link>)}
    </section>
  </main></ProfileLayout>;
}
