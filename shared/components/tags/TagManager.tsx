"use client";

import { Hash, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

type TagEntry = {
  name: string;
  count: number;
};

type TagManagerProps = {
  open: boolean;
  onClose: () => void;
  /** Called when the user picks a tag to filter by. */
  onSelectTag?: (tag: string) => void;
};

/**
 * TagManager modal — shows all tags in the system with usage counts.
 * Clicking a tag dispatches a filter event so the map highlights
 * memories that have that tag.
 */
export function TagManager({ open, onClose, onSelectTag }: TagManagerProps) {
  const { t } = useLocale();
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data: { tags: TagEntry[] } = await res.json();
        setTags(data.tags);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchTags();
  }, [open, fetchTags]);

  const filtered = search.trim()
    ? tags.filter((tag) => tag.name.toLowerCase().includes(search.toLowerCase()))
    : tags;

  const handleTagClick = (tag: string) => {
    if (onSelectTag) {
      onSelectTag(tag);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="tag-manager-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("tags.manager.title")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tag-manager-card">
        <div className="tag-manager-head">
          <div>
            <span className="eyebrow">{t("tags.manager.title")}</span>
            <h2>{t("tags.manager.heading")}</h2>
          </div>
          <button
            className="tag-manager-close"
            onClick={onClose}
            aria-label={t("tags.manager.close")}
          >
            <X size={17} />
          </button>
        </div>

        <label className="tag-manager-search">
          <Search size={13} />
          <input
            type="text"
            placeholder={t("tags.manager.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </label>

        <div className="tag-manager-body">
          {loading ? (
            <div className="tag-manager-loading">
              <span className="import-spinner" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="tag-manager-list">
              {filtered.map((tag) => (
                <button
                  key={tag.name}
                  type="button"
                  className="tag-manager-item"
                  onClick={() => handleTagClick(tag.name)}
                >
                  <Hash size={12} />
                  <span className="tag-manager-item-name">{tag.name}</span>
                  <span className="tag-manager-item-count">
                    {tag.count} {tag.count === 1 ? t("tags.manager.memory") : t("tags.manager.memories")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="tag-manager-empty">
              {search ? t("tags.manager.no.match") : t("tags.manager.empty")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
