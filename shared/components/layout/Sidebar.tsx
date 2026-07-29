"use client";
import { isMediaSrc } from "@/lib/media";
import { Compass, Heart, MapPinned, Star, Clock } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";
import { IS_DEMO } from "@/shared/lib/demo";

type ArchiveMemory = {
  id: string;
  title: string;
  place: string;
  date: string;
  color: string;
  image?: string;
  favorite?: boolean;
};
type Collection = { id: string; name: string; memoryIds: string[] };

const RECENT_KEY = "life-trace-recent-memories";
const MAX_RECENT = 5;

function getRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentId(id: string) {
  const ids = getRecentIds().filter((i) => i !== id);
  ids.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
}

export function Sidebar() {
  const { t } = useLocale();
  const [memories, setMemories] = useState<ArchiveMemory[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>(() => getRecentIds());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSelection, setCollectionSelection] = useState<string[]>([]);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) setCollections(await res.json());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<ArchiveMemory[]>).detail;
      if (!Array.isArray(detail)) return;
      setMemories(detail);
      // Prune recent IDs that no longer exist
      const validIds = detail.map((m) => m.id);
      const ids = getRecentIds().filter((id) => validIds.includes(id));
      setRecentIds(ids);
      localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
    };
    const onSelect = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (id) {
        addRecentId(id);
        setRecentIds(getRecentIds());
      }
    };
    void fetchCollections();
    window.addEventListener("life-trace-memory-state", onState);
    window.addEventListener("life-trace-select", onSelect);
    return () => {
      window.removeEventListener("life-trace-memory-state", onState);
      window.removeEventListener("life-trace-select", onSelect);
    };
  }, [fetchCollections]);

  // Show recent (from recentIds) or only favorites
  const shown = useMemo(
    () =>
      showFavoritesOnly
        ? memories.filter((memory) => memory.favorite)
        : recentIds
            .map((id) => memories.find((m) => m.id === id))
            .filter((m): m is ArchiveMemory => m != null),
    [showFavoritesOnly, memories, recentIds],
  );

  const chooseFilter = (showFav: boolean) => {
    setShowFavoritesOnly(showFav);
    window.dispatchEvent(
      new CustomEvent("life-trace-filter", { detail: showFav ? "favorites" : "all" }),
    );
  };

  const createCollection = async () => {
    const name = collectionName.trim();
    if (!name || !collectionSelection.length) return;

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memoryIds: collectionSelection }),
      });
      if (res.ok) {
        const created = await res.json();
        setCollections((prev) => [...prev, created]);
      }
    } catch {
      // silent
    }

    setCollectionName("");
    setCollectionSelection([]);
    setCollectionOpen(false);
  };

  const openCollection = (collection: Collection) => {
    window.dispatchEvent(
      new CustomEvent("life-trace-collection", {
        detail: collection.memoryIds,
      }),
    );
  };

  return (
    <aside className="sidebar">
      <span className="panel-label">{t("sidebar.your.archive")}</span>
      <h2>
        {t("sidebar.recent")} <small className="sidebar-count">{memories.length} {t("sidebar.total")}</small>
      </h2>
      <nav className="filter-tabs">
        <button
          className={!showFavoritesOnly ? "is-active" : ""}
          onClick={() => chooseFilter(false)}
        >
          <Clock size={12} /> {t("sidebar.recent")}
        </button>
        <button
          className={showFavoritesOnly ? "is-active" : ""}
          onClick={() => chooseFilter(true)}
        >
          <Heart size={12} /> {t("sidebar.favorites")}{" "}
          <small>{memories.filter((memory) => memory.favorite).length}</small>
        </button>
      </nav>
      {shown.length ? (
        <div className="memory-list">
          {shown.map((memory) => {
            const hasImage = isMediaSrc(memory.image);
            return (
              <button
                className="memory-row"
                key={memory.id}
                style={
                  {
                    "--memory-row-image": hasImage
                      ? `url("${memory.image}")`
                      : "none",
                  } as React.CSSProperties
                }
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("life-trace-select", { detail: memory.id }),
                  );
                  window.dispatchEvent(
                    new CustomEvent("life-trace-focus-memory", {
                      detail: memory.id,
                    }),
                  );
                }}
              >
                <i style={{ background: memory.color }} />
                <span>
                  <strong>{memory.title}</strong>
                  <small>{memory.place || t("sidebar.unplaced")}</small>
                </span>
                <time>{new Date(memory.date).getFullYear()}</time>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="sidebar-empty">
          <MapPinned size={22} />
          <p>
            {showFavoritesOnly
              ? t("sidebar.no.favorites")
              : t("sidebar.empty.recent")}
          </p>
          <small>
            {showFavoritesOnly
              ? t("sidebar.no.favorites.hint")
              : t("sidebar.empty.recent.hint")}
          </small>
        </div>
      )}
      <div className="sidebar-links">
        <button onClick={() => chooseFilter(!showFavoritesOnly)}>
          <Heart size={14} />
          {showFavoritesOnly ? t("sidebar.show.recent") : t("sidebar.favorites.only")}
        </button>
        <button onClick={() => setCollectionOpen((open) => !open)}>
          <Compass size={14} />
          {t("sidebar.collections")} <small>{collections.length}</small>
        </button>
        {collections.map((collection) => (
          <button
            className="collection-link"
            key={collection.id}
            onClick={() => openCollection(collection)}
          >
            <span className="collection-dot" />
            {collection.name}
          </button>
        ))}
        {!IS_DEMO && (
          <button
            className="new-collection-link"
            onClick={() => setCollectionOpen(true)}
          >
            {t("sidebar.new.collection")}
          </button>
        )}
        <span>
          <Star size={14} />
          {shown.length} {showFavoritesOnly ? t("sidebar.favorites.count") : t("sidebar.memories.count")}
        </span>
      </div>
      {!IS_DEMO && collectionOpen && (
        <div className="collection-modal" role="dialog" aria-modal="true" aria-label={t("collection.create.modal")} onMouseDown={(event) => { if (event.target === event.currentTarget) setCollectionOpen(false); }}>
          <div className="collection-modal-card">
            <div className="collection-modal-head"><div><span className="panel-label">{t("collection.title")}</span><h3>{t("collection.heading")}</h3><p>{t("collection.desc")}</p></div><button className="collection-modal-close" onClick={() => setCollectionOpen(false)} aria-label={t("collection.close")}>×</button></div>
            <input className="collection-name-input" autoFocus placeholder={t("collection.name.placeholder")} value={collectionName} onChange={(event) => setCollectionName(event.target.value)} />
            <div className="collection-picker">{memories.map((memory) => <label key={memory.id}><input type="checkbox" checked={collectionSelection.includes(memory.id)} onChange={() => setCollectionSelection((selected) => selected.includes(memory.id) ? selected.filter((id) => id !== memory.id) : [...selected, memory.id])} /><span className="collection-choice-dot" style={{ background: memory.color }} /><span>{memory.title}<small>{memory.place || t("sidebar.unplaced")}</small></span></label>)}</div>
            <div className="collection-modal-foot"><span>{collectionSelection.length} {t("collection.selected")}</span><button className="collection-save" onClick={createCollection} disabled={!collectionName.trim() || !collectionSelection.length}>{t("collection.create")}</button></div>
          </div>
        </div>
      )}
    </aside>
  );
}
