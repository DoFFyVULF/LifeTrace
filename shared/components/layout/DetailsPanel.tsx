"use client";

import {
  CalendarDays,
  Camera,
  Heart,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Link2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";
import { isMediaSrc } from "@/lib/media";

type DetailMemory = {
  id: string;
  title: string;
  place: string;
  date: string;
  color: string;
  kind: string;
  image: string;
  media?: string[];
  favorite?: boolean;
  description?: string;
  note?: string;
  city?: string | null;
  country?: string | null;
  tags?: string[];
  lat: number;
  lng: number;
};

const VISIBLE_PHOTOS = 4;

export function DetailsPanel() {
  const { t } = useLocale();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memory, setMemory] = useState<DetailMemory | null>(null);

  const fetchMemory = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`);
      if (res.ok) setMemory(await res.json());
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    const onSelect = (event: Event) => {
      const id = (event as CustomEvent<string | null>).detail;
      setSelectedId(id);
      if (id) fetchMemory(id);
      else setMemory(null);
    };
    window.addEventListener("life-trace-select", onSelect);
    return () => window.removeEventListener("life-trace-select", onSelect);
  }, [fetchMemory]);

  // Refresh detail when memory data changes externally
  useEffect(() => {
    const onState = () => {
      if (selectedId) fetchMemory(selectedId);
    };
    window.addEventListener("life-trace-memory-state", onState);
    return () => window.removeEventListener("life-trace-memory-state", onState);
  }, [selectedId, fetchMemory]);

  // Build the media list: deduplicate cover + media array
  const media = useMemo(() => {
    if (!memory) return [];
    const all = (memory.media ?? []).filter((src) => isMediaSrc(src));
    const cover = isMediaSrc(memory.image) ? memory.image : "";
    if (cover && !all.includes(cover)) all.unshift(cover);
    return all;
  }, [memory]);

  // Decide which photos to show and whether the last slot is an overlay
  const { shownPhotos, remainingCount } = useMemo(() => {
    if (media.length <= VISIBLE_PHOTOS) {
      return {
        shownPhotos: media.map((src, i) => ({ src, index: i, isOverlay: false })),
        remainingCount: 0,
      };
    }
    return {
      shownPhotos: [
        ...media.slice(0, VISIBLE_PHOTOS - 1).map((src, i) => ({ src, index: i, isOverlay: false })),
        { src: media[VISIBLE_PHOTOS - 1], index: VISIBLE_PHOTOS - 1, isOverlay: true },
      ],
      remainingCount: media.length - (VISIBLE_PHOTOS - 1),
    };
  }, [media]);

  const openPhoto = (index: number, isOverlay: boolean) => {
    if (!memory) return;
    if (isOverlay) {
      router.push(`/memory/${memory.id}`);
    } else {
      router.push(`/memory/${memory.id}?photo=${index}`);
    }
  };

  const dispatchAction = (eventName: string) => {
    if (!memory) return;
    window.dispatchEvent(new CustomEvent(eventName, { detail: memory.id }));
  };

  const toggleFavorite = useCallback(async () => {
    if (!memory) return;
    const nextFavorite = !memory.favorite;
    setMemory((prev) => (prev ? { ...prev, favorite: nextFavorite } : null));
    try {
      await fetch(`/api/memories/${memory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: nextFavorite }),
      });
      window.dispatchEvent(new CustomEvent("life-trace-memory-state"));
    } catch {
      setMemory((prev) => (prev ? { ...prev, favorite: !nextFavorite } : null));
    }
  }, [memory]);

  const hasCover = memory?.image && isMediaSrc(memory.image);

  // ─── Empty state ───────────────────────────────────────────────
  if (!memory) {
    return (
      <aside className="details-panel">
        <div className="details-empty">
          <div className="details-empty-icon">
            <Camera size={22} />
          </div>
          <p className="details-empty-title">
            {t("details.empty.title") || "Your archive"}
          </p>
          <small className="details-empty-hint">
            {t("details.empty.hint") || "Click a pin to see the full story"}
          </small>
        </div>
      </aside>
    );
  }

  // ─── Detail view ────────────────────────────────────────────────
  return (
    <aside className="details-panel">
      {/* Eyebrow */}
      <span className="panel-label">
        {t("map.selected.memory") || "SELECTED MEMORY"}
      </span>

      {/* Cover image */}
      {hasCover && (
        <div
          className="detail-cover"
          style={{
            backgroundImage: `url("${memory.image}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <span className="detail-kind-badge">{memory.kind}</span>
        </div>
      )}

      {/* Title */}
      <h2 className="detail-title">{memory.title}</h2>

      {/* Place */}
      {memory.place && (
        <div className="detail-meta-row">
          <MapPin size={13} className="detail-meta-icon" />
          <span>{memory.place}</span>
        </div>
      )}

      {/* City / country */}
      {(memory.city || memory.country) && (
        <div className="detail-meta-row detail-meta-row--location">
          <span>
            {[memory.city, memory.country].filter(Boolean).join(", ")}
          </span>
        </div>
      )}

      {/* Date */}
      <div className="detail-meta-row">
        <CalendarDays size={13} className="detail-meta-icon" />
        <time>{memory.date}</time>
      </div>

      {/* Description */}
      {memory.description && (
        <p className="detail-description">{memory.description}</p>
      )}

      {/* Note */}
      {memory.note && (
        <div className="detail-note-block">
          <span className="detail-note-label">
            {t("memory.your.note") || "YOUR NOTE"}
          </span>
          <p className="detail-note-text">{memory.note}</p>
        </div>
      )}

      {/* Tags */}
      {memory.tags && memory.tags.length > 0 && (
        <div className="tag-list">
          {memory.tags.map((tag) => (
            <span key={tag} className="tag-chip">{tag}</span>
          ))}
        </div>
      )}

      {/* Photo grid */}
      {shownPhotos.length > 0 && (
        <div className="detail-photos">
          {shownPhotos.map((photo) => (
            <button
              key={`${photo.src}-${photo.index}`}
              className={`detail-photo ${photo.isOverlay ? "detail-photo--overlay" : ""}`}
              onClick={() => openPhoto(photo.index, photo.isOverlay)}
              style={{ backgroundImage: `url("${photo.src}")` }}
              aria-label={
                photo.isOverlay
                  ? `${remainingCount} more photos`
                  : `Open photo ${photo.index + 1}`
              }
            >
              {photo.isOverlay && (
                <span className="detail-photo-overlay">
                  <Camera size={14} />
                  <span className="detail-photo-count">+{remainingCount}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="detail-divider" />

      {/* Actions */}
      <div className="detail-actions">
        <button
          className={`detail-action ${memory.favorite ? "is-favorite" : ""}`}
          onClick={toggleFavorite}
          aria-label={memory.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            size={14}
            fill={memory.favorite ? "currentColor" : "none"}
          />
          {memory.favorite
            ? t("map.remove.favorite") || "Unfavorite"
            : t("map.add.to.favorites") || "Favorite"}
        </button>

        <button
          className="detail-action"
          onClick={() => dispatchAction("life-trace-edit-memory")}
        >
          <Pencil size={14} />
          {t("map.edit") || "Edit"}
        </button>

        <button
          className="detail-action"
          onClick={() => dispatchAction("life-trace-link-memory")}
        >
          <Link2 size={14} />
          {t("map.link.this") || "Link"}
        </button>

        <Link
          href={`/memory/${memory.id}`}
          className="detail-action detail-action--link"
        >
          <ImageIcon size={14} />
          {t("map.open.memory") || "Open"}
        </Link>

        <button
          className="detail-action detail-action--delete"
          onClick={() => dispatchAction("life-trace-delete-memory")}
        >
          <Trash2 size={14} />
          {t("map.delete.memory") || "Delete"}
        </button>
      </div>
    </aside>
  );
}
