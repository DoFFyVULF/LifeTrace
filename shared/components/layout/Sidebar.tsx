"use client";
import { Compass, Heart, MapPinned, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export function Sidebar() {
  const [memories, setMemories] = useState<ArchiveMemory[]>([]);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionSelection, setCollectionSelection] = useState<string[]>([]);
  useEffect(() => {
    const onState = (event: Event) =>
      setMemories((event as CustomEvent<ArchiveMemory[]>).detail);
    const onFilter = (event: Event) =>
      setFilter((event as CustomEvent<"all" | "favorites">).detail);
    try {
      setCollections(
        JSON.parse(localStorage.getItem("life-trace-collections") || "[]"),
      );
    } catch {
      setCollections([]);
    }
    window.addEventListener("life-trace-memory-state", onState);
    window.addEventListener("life-trace-filter", onFilter);
    return () => {
      window.removeEventListener("life-trace-memory-state", onState);
      window.removeEventListener("life-trace-filter", onFilter);
    };
  }, []);
  const shown = useMemo(
    () =>
      filter === "favorites"
        ? memories.filter((memory) => memory.favorite)
        : memories,
    [filter, memories],
  );
  const chooseFilter = (value: "all" | "favorites") => {
    setFilter(value);
    window.dispatchEvent(
      new CustomEvent("life-trace-filter", { detail: value }),
    );
  };
  const createCollection = () => {
    const name = collectionName.trim();
    if (!name || !collectionSelection.length) return;
    const next = [
      ...collections,
      { id: crypto.randomUUID(), name, memoryIds: collectionSelection },
    ];
    setCollections(next);
    localStorage.setItem("life-trace-collections", JSON.stringify(next));
    setCollectionName("");
    setCollectionSelection([]);
    setCollectionOpen(false);
  };
  const openCollection = (collection: Collection) => {
    setFilter("all");
    window.dispatchEvent(
      new CustomEvent("life-trace-collection", {
        detail: collection.memoryIds,
      }),
    );
  };
  return (
    <aside className="sidebar">
      <span className="panel-label">Your archive</span>
      <h2>
        Memories <small className="sidebar-count">{memories.length}</small>
      </h2>
      <nav className="filter-tabs">
        <button
          className={filter === "all" ? "is-active" : ""}
          onClick={() => chooseFilter("all")}
        >
          All
        </button>
        <button
          className={filter === "favorites" ? "is-active" : ""}
          onClick={() => chooseFilter("favorites")}
        >
          <Heart size={12} /> Favorites{" "}
          <small>{memories.filter((memory) => memory.favorite).length}</small>
        </button>
      </nav>
      {shown.length ? (
        <div className="memory-list">
          {shown.map((memory) => {
            const hasImage =
              memory.image?.startsWith("data:") ||
              memory.image?.startsWith("http");
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
                  <small>{memory.place || "Unplaced memory"}</small>
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
            {filter === "favorites"
              ? "No favorites yet."
              : "Your archive is ready for its first story."}
          </p>
          <small>
            {filter === "favorites"
              ? "Mark a memory with the heart to keep it close."
              : "Click the map or drop a photo to add a memory."}
          </small>
        </div>
      )}
      <div className="sidebar-links">
        <button onClick={() => chooseFilter("favorites")}>
          <Heart size={14} />
          Favorites
        </button>
        <button onClick={() => setCollectionOpen((open) => !open)}>
          <Compass size={14} />
          Collections <small>{collections.length}</small>
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
        <button
          className="new-collection-link"
          onClick={() => setCollectionOpen(true)}
        >
          + New collection
        </button>
        <span>
          <Star size={14} />
          {shown.length} visible moments
        </span>
      </div>
      {collectionOpen && (
        <div className="collection-modal" role="dialog" aria-modal="true" aria-label="Create collection" onMouseDown={(event) => { if (event.target === event.currentTarget) setCollectionOpen(false); }}>
          <div className="collection-modal-card">
            <div className="collection-modal-head"><div><span className="panel-label">NEW COLLECTION</span><h3>Gather a chapter</h3><p>Bring a few memories together and give the story a name.</p></div><button className="collection-modal-close" onClick={() => setCollectionOpen(false)} aria-label="Close collection dialog">×</button></div>
            <input className="collection-name-input" autoFocus placeholder="Collection name" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} />
            <div className="collection-picker">{memories.map((memory) => <label key={memory.id}><input type="checkbox" checked={collectionSelection.includes(memory.id)} onChange={() => setCollectionSelection((selected) => selected.includes(memory.id) ? selected.filter((id) => id !== memory.id) : [...selected, memory.id])} /><span className="collection-choice-dot" style={{ background: memory.color }} /><span>{memory.title}<small>{memory.place || "Unplaced memory"}</small></span></label>)}</div>
            <div className="collection-modal-foot"><span>{collectionSelection.length} memories selected</span><button className="collection-save" onClick={createCollection} disabled={!collectionName.trim() || !collectionSelection.length}>Create collection</button></div>
          </div>
        </div>
      )}
    </aside>
  );
}
