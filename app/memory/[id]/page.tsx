"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Play,
  Plus,
  Save,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { Memory } from "@/features/map/components/MapCanvas";
import { Switch } from "@/shared/components/ui/Switch";
import { isMediaSrc, prepareUpload, uploadMedia } from "@/lib/media";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

type EditableMemory = Memory & { description?: string; note?: string };
const isVideo = (src: string) =>
  src.startsWith("data:video/") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src);

export default function MemoryPage() {
  const { t } = useLocale();
  const { id } = useParams<{ id: string }>();
  const [memory, setMemory] = useState<EditableMemory | null>(null);
  const [editing, setEditing] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/memories/${id}`);
        if (res.ok) {
          setMemory(await res.json());
        } else {
          setMemory(null);
        }
      } catch {
        setMemory(null);
      }
    })();
  }, [id]);

  const persist = async (updated: EditableMemory) => {
    setMemory(updated);
    try {
      await fetch(`/api/memories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      window.dispatchEvent(new CustomEvent("life-trace-memory-state"));
    } catch {
      // silent
    }
  };

  const update = (
    key: keyof Pick<
      EditableMemory,
      "title" | "place" | "date" | "description" | "note"
    >,
    value: string,
  ) =>
    setMemory((current) =>
      current
        ? {
            ...current,
            [key]: value,
            ...(key === "date" ? { year: value.slice(0, 4) } : {}),
          }
        : current,
    );

  const media = memory?.media ?? [];
  const heroImage = memory ? (isMediaSrc(memory.image) ? memory.image : media[0]) : undefined;

  const addPhotos = async (files: File[]) => {
    if (!memory || !files.length) return;
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const { blob, name } = await prepareUpload(file);
          return uploadMedia(blob, name);
        }),
      );
      const nextMedia = [...media, ...urls];
      persist({
        ...memory,
        image: isMediaSrc(memory.image) ? memory.image : urls[0],
        media: nextMedia,
      });
    } catch {
      // silent
    }
  };

  const onChoose = (event: React.ChangeEvent<HTMLInputElement>) => {
    void addPhotos(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    void addPhotos(
      Array.from(event.dataTransfer.files).filter(
        (file) =>
          file.type.startsWith("image/") || file.type.startsWith("video/"),
      ),
    );
  };

  const save = () => {
    if (memory) void persist(memory);
    setEditing(false);
  };

  const removeMedia = (index: number) => {
    if (!memory) return;
    const next = media.filter((_, itemIndex) => itemIndex !== index);
    persist({ ...memory, media: next, image: next[0] || memory.image });
    if (viewerIndex === index) setViewerIndex(null);
    else if (viewerIndex !== null && viewerIndex > index)
      setViewerIndex(viewerIndex - 1);
  };

  useEffect(() => {
    if (viewerIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerIndex(null);
      if (event.key === "ArrowRight")
        setViewerIndex((index) =>
          index === null ? null : (index + 1) % media.length,
        );
      if (event.key === "ArrowLeft")
        setViewerIndex((index) =>
          index === null ? null : (index - 1 + media.length) % media.length,
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerIndex, media.length]);

  const galleryClass = `media-grid media-grid--${Math.min(media.length, 5)}`;

  if (!memory)
    return (
      <main className="memory-page">
        <header className="memory-header">
          <Link href="/" className="back-link">
            <ArrowLeft size={16} /> {t("memory.back")}
          </Link>
        </header>
        <div className="memory-not-found">
          <h1>{t("memory.not.found")}</h1>
          <p>{t("memory.not.found.hint")}</p>
          <Link href="/">{t("memory.return.to.map")}</Link>
        </div>
      </main>
    );

  return (
    <main className="memory-page">
      <header className="memory-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> {t("memory.back")}
        </Link>
        <span className="memory-header-mark">{t("memory.header.mark")}</span>
        <div className="memory-header-actions">
          <button
            className="memory-share"
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
          >
            <Share2 size={15} /> {t("memory.share")}
          </button>
          <Switch checked={editing} onChange={(checked) => checked ? setEditing(true) : save()} />
        </div>
      </header>
      <section className={`memory-hero ${editing ? "is-editing" : ""}`}>
        <div className="memory-hero-copy">
          <span className="eyebrow">
            {memory.kind} · {memory.year}
          </span>
          {editing ? (
            <input
              className="memory-title-input"
              value={memory.title}
              onChange={(event) => update("title", event.target.value)}
            />
          ) : (
            <h1>{memory.title}</h1>
          )}
          <p className="memory-location">
            <MapPin size={15} />
            {editing ? (
              <input
                value={memory.place}
                onChange={(event) => update("place", event.target.value)}
              />
            ) : (
              memory.place
            )}
          </p>
          <div className={`memory-description-wrap ${editing ? "is-editing" : ""}`}>
            {editing ? (
              <textarea className="memory-description-input" value={memory.description ?? t("memory.default.description")} onChange={(event) => update("description", event.target.value)} />
            ) : (
              <p className="memory-description">{memory.description || t("memory.default.description")}</p>
            )}
          </div>
          <div className="memory-meta">
            <span>
              <CalendarDays size={15} />
              {editing ? (
                <input
                  type="date"
                  value={memory.date}
                  onChange={(event) => update("date", event.target.value)}
                />
              ) : (
                memory.date
              )}
            </span>
            <span>
              <MapPin size={15} />
              {memory.city || memory.country
                ? [memory.city, memory.country].filter(Boolean).join(", ")
                : `${memory.lat.toFixed(2)}° · ${memory.lng.toFixed(2)}°`}
            </span>
          </div>
        </div>
        {editing || !heroImage ? (
          <label
            className={`memory-hero-art memory-hero-drop ${editing ? "is-editing" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            style={
              heroImage
                ? {
                    backgroundImage: `url("${heroImage}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}
            }
          >
            <input
              className="media-input"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={onChoose}
            />
            {!heroImage && (
              <div className="memory-art-caption">
                <span className="caption-placeholder">PLACEHOLDER IMAGE</span>
                <br />
                <small>Click or drop photos and videos here</small>
              </div>
            )}
          </label>
        ) : (
          <div
            className="memory-hero-art"
            style={{
              backgroundImage: `url("${heroImage}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
      </section>
      <section className="memory-content">
        <div>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t("memory.visual.journal")}</span>
              <h2>{t("memory.moments.from.here")}</h2>
            </div>
            <div className="memory-edit-actions">
              {editing && (
                <button className="add-media add-media--save" onClick={save}>
                  <Save size={14} /> {t("memory.save.changes")}
                </button>
              )}
              <label className="add-media">
                <Plus size={14} /> {t("memory.add.media")}
                <input
                  className="media-input"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={onChoose}
                />
              </label>
            </div>
          </div>
          <div className={galleryClass}>
            {media.map((src, index) => (
              <button
                className="media-slot"
                key={`${src}-${index}`}
                onClick={() => setViewerIndex(index)}
              >
                {isVideo(src) ? (
                  <video src={src} muted />
                ) : (
                  <img src={src} alt={`${memory.title} ${t("memory.hero.item")}`} />
                )}
                <span className="media-slot-label">
                  {isVideo(src) ? (
                    <>
                      <Play size={12} /> {t("memory.video")}
                    </>
                  ) : (
                    <>
                      <ImageIcon size={12} /> {t("memory.photo")}
                    </>
                  )}{" "}
                  · {String(index + 1).padStart(2, "0")}
                </span>
                {editing && (
                  <span
                    className="media-delete"
                    role="button"
                    aria-label={`${t("memory.delete")} ${index + 1}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeMedia(index);
                    }}
                  >
                    <Trash2 size={14} />
                  </span>
                )}
              </button>
            ))}
            {!media.length && (
              <div className="media-empty">
                <ImageIcon size={20} />
                <span>{t("memory.no.moments")}</span>
                <small>{t("memory.no.moments.hint")}</small>
              </div>
            )}
          </div>
        </div>
        <aside className="memory-notes">
          <span className="eyebrow">{t("memory.your.note")}</span>
          <div className={`memory-note-wrap ${editing ? "is-editing" : ""}`}>
            {editing ? <textarea className="memory-note-input" value={memory.note ?? t("memory.default.note")} onChange={(event) => update("note", event.target.value)} /> : <p>{memory.note || t("memory.default.note")}</p>}
          </div>
          <div className="notes-rule" />
          <span className="eyebrow">{t("memory.connected.to")}</span>
          <Link href="/">{t("memory.view.on.map")}</Link>
        </aside>
      </section>
      {viewerIndex !== null && media[viewerIndex] && (
        <div
          className="media-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          onClick={() => setViewerIndex(null)}
        >
          <button
            className="media-viewer-close"
            onClick={() => setViewerIndex(null)}
          >
            <X size={20} />
          </button>
          <button
            className="media-viewer-nav media-viewer-nav--prev"
            aria-label={t("memory.previous.media")}
            onClick={(event) => {
              event.stopPropagation();
              setViewerIndex((viewerIndex - 1 + media.length) % media.length);
            }}
          >
            <ChevronLeft size={25} />
          </button>
          <div
            className="media-viewer-stage"
            onClick={(event) => event.stopPropagation()}
          >
            {isVideo(media[viewerIndex]) ? (
              <video src={media[viewerIndex]} controls autoPlay />
            ) : (
              <img
                src={media[viewerIndex]}
                alt={`${memory.title} moment ${viewerIndex + 1}`}
              />
            )}
          </div>
          <button
            className="media-viewer-nav media-viewer-nav--next"
            aria-label={t("memory.next.media")}
            onClick={(event) => {
              event.stopPropagation();
              setViewerIndex((viewerIndex + 1) % media.length);
            }}
          >
            <ChevronRight size={25} />
          </button>
          <span className="media-viewer-count">
            {viewerIndex + 1} / {media.length}
          </span>
        </div>
      )}
    </main>
  );
}
