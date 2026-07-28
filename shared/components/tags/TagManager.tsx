"use client";

import { Hash, Plus, Search, Trash2, X } from "lucide-react";
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

const TAG_REGEX = /^[a-zA-Zа-яА-ЯёЁ0-9_\-+#]+$/;

/**
 * TagManager modal — shows all tags in the system with usage counts.
 * Allows creating new tags (stored in the profile's known-tags list)
 * and deleting tags globally (removed from all memories + known tags).
 */
export function TagManager({ open, onClose, onSelectTag }: TagManagerProps) {
  const { t } = useLocale();
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [newTag, setNewTag] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
    if (open) {
      void fetchTags();
      setSearch("");
      setNewTag("");
      setDeleteConfirm(null);
    }
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

  const handleCreate = async () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || !TAG_REGEX.test(tag)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tag }),
      });
      if (res.ok) {
        setNewTag("");
        await fetchTags();
      }
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (tag: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tags?name=${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteConfirm(null);
        await fetchTags();
      }
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
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

        {/* Create new tag */}
        <div className="tag-manager-create">
          <input
            type="text"
            placeholder={t("tags.placeholder")}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
          <button
            type="button"
            className="tag-manager-create-btn"
            disabled={!newTag.trim() || actionLoading}
            onClick={handleCreate}
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Search existing */}
        <label className="tag-manager-search">
          <Search size={13} />
          <input
            type="text"
            placeholder={t("tags.manager.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                <div key={tag.name} className="tag-manager-item-row">
                  <button
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
                  {deleteConfirm === tag.name ? (
                    <div className="tag-manager-delete-confirm">
                      <button
                        type="button"
                        className="tag-manager-delete-yes"
                        disabled={actionLoading}
                        onClick={() => handleDelete(tag.name)}
                      >
                        {t("map.delete.permanently")}
                      </button>
                      <button
                        type="button"
                        className="tag-manager-delete-no"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        {t("map.cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="tag-manager-delete-btn"
                      aria-label={`Delete tag ${tag.name}`}
                      onClick={() => setDeleteConfirm(tag.name)}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
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
