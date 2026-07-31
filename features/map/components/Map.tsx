"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Layers3,
  Link2,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { isMediaSrc, prepareUpload, uploadMedia } from "@/lib/media";
import { reverseGeocode } from "@/lib/geocode";
import { processFileMetadata, type FileMetadataResult } from "@/lib/photo-metadata.client";
import { IS_DEMO } from "@/shared/lib/demo";
import {
  applyDemoOverrides,
  isDemoDeleted,
} from "@/shared/lib/demoStore";
import { isPhotoFile } from "@/lib/photo-metadata";
import type { Memory, MemoryThread, MapStyle } from "./MapCanvas";
import { MapCanvas } from "./MapCanvas";
import { getRandomMemoryColor, mixColors, PIN_SYMBOLS, type PinSymbol } from "@/lib/colors";
import { TagInput } from "@/shared/components/ui/TagInput";
import { useLocale } from "@/shared/lib/locale/LocaleProvider";

const today = () => new Date().toISOString().slice(0, 10);
type FormData = {
  title: string; place: string; date: string; kind: string;
  color: string; lng: number; lat: number; cover: string;
  symbol: PinSymbol; city: string; country: string; tags: string[];
};
const emptyForm: FormData = {
  title: "",
  place: "",
  date: today(),
  kind: "memory",
  color: "#ef766b",
  lng: 0,
  lat: 0,
  cover: "",
  symbol: "pin" as PinSymbol,
  city: "",
  country: "",
  tags: [],
};


export function Map() {
  const { t, locale } = useLocale();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showThreads, setShowThreads] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [vivid, setVivid] = useState(false);
  const [activeYear, setActiveYear] = useState("all");
  const [filterMode, setFilterMode] = useState<"all" | "favorites">("all");
  const [collectionIds, setCollectionIds] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [threads, setThreads] = useState<MemoryThread[]>([]);
  const [linkingIds, setLinkingIds] = useState<string[] | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState<{
    done: number;
    total: number;
    fileName: string;
  } | null>(null);
  const [importToast, setImportToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Memory | null>(null);
  const [mounted, setMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    cover: string;
    media: string[];
    title: string;
    date: string;
  } | null>(null);
  const [gpsConflict, setGpsConflict] = useState<{
    entries: FileMetadataResult[];
    photos: File[];
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickingLocation, setPickingLocation] = useState<FormData | null>(null);
  const pickingLocationRef = useRef<FormData | null>(null);
  const pendingImportRef = useRef(pendingImport);
  const pendingMediaRef = useRef<string[] | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [mapStyle, setMapStyle] = useState<MapStyle>("light");
  const [styleOpen, setStyleOpen] = useState(false);
  const stylePickerRef = useRef<HTMLDivElement>(null);

  // Load saved map style after hydration to avoid SSR mismatch
  useEffect(() => {
    const saved = localStorage.getItem("life-trace-map-style") as MapStyle | null;
    if (saved && saved !== mapStyle) setMapStyle(saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const MAP_STYLES = useMemo<Record<MapStyle, { label: string; icon: string }>>(() => ({
    light: { label: "map.style.light", icon: "☀️" },
    dark: { label: "map.style.dark", icon: "🌙" },
    satellite: { label: "map.style.satellite", icon: "🛰️" },
    vintage: { label: "map.style.vintage", icon: "🎨" },
  }), []);
  const stableLinkingIds = useMemo(() => linkingIds ?? [], [linkingIds]);
  const selectedRef = useRef<string | null>(null);
  const memoriesRef = useRef<Memory[]>(memories);
  const addModeRef = useRef(false);
  useEffect(() => {
    setMounted(true);
    setPortalContainer(document.body);
  }, []);
  useEffect(() => {
    pickingLocationRef.current = pickingLocation;
  }, [pickingLocation]);
  // Fetch all existing tags once for autocomplete
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/tags");
        if (res.ok) {
          const data: { tags: { name: string; count: number }[] } =
            await res.json();
          setAllTags(data.tags.map((t) => t.name));
        }
      } catch { /* silent */ }
    })();
  }, []);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);
  useEffect(() => {
    addModeRef.current = addMode;
  }, [addMode]);
  useEffect(() => {
    pendingImportRef.current = pendingImport;
  }, [pendingImport]);
  useEffect(() => {
    void (async () => {
      try {
        const [m, t] = await Promise.all([
          fetch("/api/memories").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/threads").then((r) => (r.ok ? r.json() : [])),
        ]);
        setMemories(
          (m as Memory[])
            .filter((mm) => !isDemoDeleted(mm.id))
            .map((mm) => applyDemoOverrides(mm)),
        );
        setThreads(t as MemoryThread[]);
      } catch {
        setMemories([]);
        setThreads([]);
      }
    })();
    if (sessionStorage.getItem("life-trace-queue-add") === "1") {
      sessionStorage.removeItem("life-trace-queue-add");
      setForm(null);
      setSelectedId(null);
      setAddMode(true);
    }
    const onYear = (event: Event) =>
      setActiveYear((event as CustomEvent<string>).detail);
    const onSearch = (event: Event) =>
      setSearch((event as CustomEvent<string>).detail);
    const onAdd = () => {
      setForm(null);
      setSelectedId(null);
      setAddMode(true);
    };
    const onFilter = (event: Event) => {
      setFilterMode((event as CustomEvent<"all" | "favorites">).detail);
      setCollectionIds(null);
    };
    const onSelectMemory = (event: Event) =>
      setSelectedId((event as CustomEvent<string>).detail);
    const onCollection = (event: Event) => {
      setCollectionIds((event as CustomEvent<string[]>).detail);
      setFilterMode("all");
    };
    const onShowThreads = () => {
      setLinkingIds(null);
      setShowThreads(true);
    };
    window.addEventListener("life-trace-year", onYear);
    window.addEventListener("life-trace-search", onSearch);
    if (!IS_DEMO) window.addEventListener("life-trace-add", onAdd);
    window.addEventListener("life-trace-filter", onFilter);
    window.addEventListener("life-trace-select", onSelectMemory);
    window.addEventListener("life-trace-collection", onCollection);
    window.addEventListener("life-trace-show-threads", onShowThreads);

    const onEditMemory = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const target = memoriesRef.current.find((m) => m.id === id);
      if (target) startEdit(target);
    };
    const onDeleteMemory = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const target = memoriesRef.current.find((m) => m.id === id);
      if (target) setDeleteTarget(target);
    };
    const onLinkMemory = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setShowThreads(false);
      setLinkingIds([id]);
    };
    if (!IS_DEMO) window.addEventListener("life-trace-edit-memory", onEditMemory);
    if (!IS_DEMO) window.addEventListener("life-trace-delete-memory", onDeleteMemory);
    if (!IS_DEMO) window.addEventListener("life-trace-link-memory", onLinkMemory);

    return () => {
      window.removeEventListener("life-trace-year", onYear);
      window.removeEventListener("life-trace-search", onSearch);
      window.removeEventListener("life-trace-add", onAdd);
      window.removeEventListener("life-trace-filter", onFilter);
      window.removeEventListener("life-trace-select", onSelectMemory);
      window.removeEventListener("life-trace-collection", onCollection);
      window.removeEventListener("life-trace-show-threads", onShowThreads);
      window.removeEventListener("life-trace-edit-memory", onEditMemory);
      window.removeEventListener("life-trace-delete-memory", onDeleteMemory);
      window.removeEventListener("life-trace-link-memory", onLinkMemory);
    };
  }, []);

  // Re‑geocode all memories when locale changes so city/country reflect the current language
  useEffect(() => {
    if (!memories.length) return;
    let cancelled = false;
    void (async () => {
      const updated = await Promise.all(
        memories.map(async (m) => {
          if (!m.lat || !m.lng) return null;
          const geo = await reverseGeocode(m.lat, m.lng, locale).catch(() => null);
          if (!geo) return null;
          const newCity = geo.city || m.city;
          const newCountry = geo.country || m.country;
          if (newCity === m.city && newCountry === m.country) return null;
          fetch(`/api/memories/${m.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: newCity, country: newCountry }),
          }).catch(() => {});
          return { ...m, city: newCity, country: newCountry };
        }),
      );
      if (cancelled) return;
      const patched = updated.filter(Boolean) as Memory[];
      if (patched.length) {
        setMemories((prev) =>
          prev.map((m) => patched.find((p) => p.id === m.id) ?? m),
        );
      }
    })();
    return () => { cancelled = true; };
  }, [locale]);
  const setLocalMemories = (next: Memory[]) => {
    setMemories(next);
    window.dispatchEvent(
      new CustomEvent("life-trace-memory-state", {
        detail: next.map(
          ({ id, title, place, date, color, favorite, image }) => ({
            id,
            title,
            place,
            date,
            color,
            favorite,
            image,
          }),
        ),
      }),
    );
  };
  const setLocalThreads = (next: MemoryThread[]) => setThreads(next);
  const openCreate = (lng = 0, lat = 0, city = "", country = "") =>
    setForm({
      ...emptyForm,
      color: getRandomMemoryColor(),
      symbol: "pin",
      place: lng || lat ? `${lat.toFixed(5)}°, ${lng.toFixed(5)}°` : "",
      lng: Number(lng.toFixed(5)),
      lat: Number(lat.toFixed(5)),
      date: today(),
      city,
      country,
    });
  const openEdit = (memory: Memory) => {
    setEditingId(memory.id);
    pendingMediaRef.current = memory.media ?? null;
    setForm({
      title: memory.title,
      place: memory.place,
      date: memory.date,
      kind: memory.kind,
      color: memory.color,
      symbol: (memory.symbol as PinSymbol) || "pin",
      lng: memory.lng,
      lat: memory.lat,
      cover: isMediaSrc(memory.image) ? memory.image : "",
      city: memory.city || "",
      country: memory.country || "",
      tags: memory.tags ?? [],
    });
  };
  const save = async () => {
    if (!form?.title.trim()) return;

    // Reverse-geocode if lat/lng are set but city/country are missing
    let city = form.city;
    let country = form.country;
    if ((!city || !country) && form.lat && form.lng) {
      try {
        const geo = await reverseGeocode(form.lat, form.lng, locale);
        if (geo) {
          if (!city) city = geo.city || "";
          if (!country) country = geo.country || "";
        }
      } catch { /* silent */ }
    }

    const memoryData = {
      title: form.title,
      place: form.place,
      date: form.date || new Date().toISOString().slice(0, 10),
      lat: form.lat,
      lng: form.lng,
      color: form.color,
      kind: form.kind,
      symbol: form.symbol,
      image: form.cover || form.color,
      media: pendingMediaRef.current || (form.cover ? [form.cover] : []),
      favorite: false,
      city: city || null,
      country: country || null,
      tags: form.tags,
    };
    pendingMediaRef.current = null;
    try {
      if (editingId) {
        // Update existing memory
        const res = await fetch(`/api/memories/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(memoryData),
        });
        if (!res.ok) throw new Error("Update failed");
        const updated: Memory = await res.json();
        setLocalMemories(memories.map((m) => (m.id === editingId ? updated : m)));
        setSelectedId(updated.id);
      } else {
        // Create new memory
        const res = await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(memoryData),
        });
        if (!res.ok) throw new Error("Create failed");
        const created: Memory = await res.json();
        setLocalMemories([...memories, created]);
        setSelectedId(created.id);
      }
      setForm(null);
      setEditingId(null);
      setPickingLocation(null);
    } catch {
      setImportToast(t("map.save.failed"));
    }
  };
  const startEdit = (memory: Memory) => {
    setEditingId(memory.id);
    // Preserve existing media so "Pick on map" + save doesn't
    // lose photos that aren't the cover image (see save() — it reads
    // pendingMediaRef.current to build the PATCH body).
    pendingMediaRef.current = memory.media ?? null;
    setForm({
      title: memory.title,
      place: memory.place,
      date: memory.date,
      kind: memory.kind,
      color: memory.color,
      symbol: (memory.symbol as PinSymbol) || "pin",
      lng: memory.lng,
      lat: memory.lat,
      cover: isMediaSrc(memory.image) ? memory.image : "",
      city: memory.city || "",
      country: memory.country || "",
      tags: memory.tags ?? [],
    });
    setSelectedId(null);
  };
  const setCover = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { blob, name } = await prepareUpload(file);
      const url = await uploadMedia(blob, name);
      setForm((current) => (current ? { ...current, cover: url } : current));
    } catch {
      setImportToast(t("map.image.failed"));
    }
  };
  const visible = useMemo(
    () =>
      memories.filter(
        (memory) =>
          (collectionIds
            ? collectionIds.includes(memory.id)
            : filterMode === "all" || memory.favorite) &&
          (activeYear === "all" || memory.year === activeYear) &&
          (!search ||
            `${memory.title} ${memory.place} ${memory.city ?? ""} ${memory.country ?? ""} ${(memory.tags ?? []).join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [memories, activeYear, search, filterMode, collectionIds],
  );
  // selected is now handled by DetailsPanel
  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    // In demo mode, map clicks only select memories, never create new ones
    if (IS_DEMO) return;

    let city = "";
    let country = "";
    try {
      const geo = await reverseGeocode(lat, lng, locale);
      if (geo) {
        city = geo.city || "";
        country = geo.country || "";
      }
    } catch { /* geocode failed, proceed without */ }

    if (pendingImportRef.current) {
      const data = pendingImportRef.current;
      pendingMediaRef.current = data.media;
      setForm({
        ...emptyForm,
        title: data.title,
        date: data.date,
        place: `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`,
        lng: Number(lng.toFixed(5)),
        lat: Number(lat.toFixed(5)),
        cover: data.cover,
        city,
        country,
      });
      setPendingImport(null);
      return;
    }
    if (selectedRef.current && !addModeRef.current) {
      setSelectedId(null);
      window.dispatchEvent(
        new CustomEvent("life-trace-select", { detail: null }),
      );
      return;
    }
    if (pickingLocationRef.current) {
      const saved = pickingLocationRef.current;
      setForm({
        ...saved,
        place: `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`,
        lng: Number(lng.toFixed(5)),
        lat: Number(lat.toFixed(5)),
        city,
        country,
      });
      setPickingLocation(null);
      setAddMode(false);
      return;
    }
    setAddMode(false);
    openCreate(lng, lat, city, country);
  }, [locale]);

  // ── GPS conflict helpers ────────────────────────────────────────────────

  /** Round coords to ~0.1° (~10 km) for grouping. */
  const coordGroupKey = (lat: number, lng: number) =>
    `${(lat * 10).toFixed(0)}_${(lng * 10).toFixed(0)}`;

  /** Returns true when entries have more than one distinct GPS cluster. */
  const hasMixedGps = (
    entries: { metadata: { lat?: number; lng?: number } }[],
  ) => {
    const keys = new Set<string>();
    for (const e of entries) {
      if (e.metadata.lat !== undefined && e.metadata.lng !== undefined) {
        keys.add(coordGroupKey(e.metadata.lat, e.metadata.lng));
      }
    }
    return keys.size > 1;
  };

  /** Create a memory from a subset of entry results. */
  const createMemoryFromEntries = async (
    group: FileMetadataResult[],
  ) => {
    const gpsGroup = group.filter(
      (e) => e.metadata.lat !== undefined && e.metadata.lng !== undefined,
    );
    const groupDate =
      group.map((e) => e.metadata.date).sort()[0] || today();
    const groupTitle = group.length === 1
      ? group[0].fileName.replace(/\.[^.]+$/, "")
      : `${group[0].fileName.replace(/\.[^.]+$/, "")} + ${group.length - 1}`;
    const groupCover = group[0].url;
    const groupMedia = group.map((e) => e.url);

    let lat = 0;
    let lng = 0;
    let city: string | null = null;
    let country: string | null = null;

    if (gpsGroup.length) {
      // All grouped photos share the same GPS cluster, so average is fine
      lat =
        gpsGroup.reduce((s, e) => s + Number(e.metadata.lat), 0) / gpsGroup.length;
      lng =
        gpsGroup.reduce((s, e) => s + Number(e.metadata.lng), 0) / gpsGroup.length;
      try {
        const geo = await reverseGeocode(lat, lng, locale);
        if (geo) { city = geo.city; country = geo.country; }
      } catch { /* silent */ }
    }

    const res = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: groupTitle,
        place: lat || lng ? `${lat.toFixed(4)}°, ${lng.toFixed(4)}°` : "",
        date: groupDate,
        lat,
        lng,
        color: getRandomMemoryColor(),
        symbol: "pin",
        kind: "memory",
        image: groupCover,
        media: groupMedia,
        favorite: false,
        city,
        country,
      }),
    });
    if (!res.ok) throw new Error("Create failed");
    const newMemory = (await res.json()) as Memory;

    // Trigger achievement check for EXIF GPS import (#25)
    if (gpsGroup.length > 0) {
      fetch("/api/achievements/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceIds: [25] }),
      })
        .then((r) => r.json().catch(() => null))
        .then((data) => {
          if (data?.newlyUnlocked?.length) {
            window.dispatchEvent(
              new CustomEvent("life-trace-new-achievement", {
                detail: { achievements: data.newlyUnlocked },
              }),
            );
          }
        })
        .catch(() => {});
    }

    return newMemory;
  };

  /** Merge all entries into a single memory. */
  const finishImport = async (entries: FileMetadataResult[], photos: File[]) => {
    const gps = entries.filter(
      (e) => e.metadata.lat !== undefined && e.metadata.lng !== undefined,
    );
    const date = entries.map((e) => e.metadata.date).sort()[0] || today();
    const title =
      photos.length === 1
        ? photos[0].name.replace(/\.[^.]+$/, "")
        : `${photos[0].name.replace(/\.[^.]+$/, "")} + ${photos.length - 1} photos`;
    const cover = entries[0].url;
    const media = entries.map((e) => e.url);

    if (!gps.length) {
      setPendingImport({ cover, media, title, date });
      return;
    }

    const lat =
      gps.reduce((s, e) => s + Number(e.metadata.lat), 0) / gps.length;
    const lng =
      gps.reduce((s, e) => s + Number(e.metadata.lng), 0) / gps.length;
    let city: string | null = null;
    let country: string | null = null;
    try {
      const geo = await reverseGeocode(lat, lng, locale);
      if (geo) { city = geo.city; country = geo.country; }
    } catch { /* silent */ }

    const res = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        place: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
        date, lat, lng,
        color: getRandomMemoryColor(), symbol: "pin", kind: "memory",
        image: cover, media, favorite: false, city, country,
      }),
    });
    if (!res.ok) throw new Error("Create failed");
    const created: Memory = await res.json();

    // Trigger achievement check for EXIF GPS import (#25)
    if (gps.length > 0) {
      fetch("/api/achievements/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceIds: [25] }),
      })
        .then((r) => r.json().catch(() => null))
        .then((data) => {
          if (data?.newlyUnlocked?.length) {
            window.dispatchEvent(
              new CustomEvent("life-trace-new-achievement", {
                detail: { achievements: data.newlyUnlocked },
              }),
            );
          }
        })
        .catch(() => {});
    }

    setLocalMemories([...memories, created]);
    setSelectedId(created.id);
    setImportToast(
      `${entries.length} ${entries.length === 1 ? t("map.photo.added") : t("map.photos.added")}`,
    );
  };

  const handleGpsMerge = async () => {
    const conflict = gpsConflict;
    if (!conflict) return;
    setGpsConflict(null);
    setImporting({ done: 0, total: conflict.entries.length, fileName: "" });
    await finishImport(conflict.entries, conflict.photos);
    setImporting(null);
  };

  const handleGpsSplit = async () => {
    const conflict = gpsConflict;
    if (!conflict) return;
    setGpsConflict(null);

    // Group entries by GPS cluster
    const groupMap: Record<string, { entries: FileMetadataResult[] }> = {};
    const noGps: FileMetadataResult[] = [];

    for (const entry of conflict.entries) {
      if (entry.metadata.lat !== undefined && entry.metadata.lng !== undefined) {
        const key = coordGroupKey(entry.metadata.lat, entry.metadata.lng);
        if (!groupMap[key]) groupMap[key] = { entries: [] };
        groupMap[key].entries.push(entry);
      } else {
        noGps.push(entry);
      }
    }

    const groups = Object.values(groupMap);
    if (noGps.length) groups.push({ entries: noGps });

    setImporting({ done: 0, total: groups.length, fileName: "" });
    const created: Memory[] = [];

    try {
      for (let i = 0; i < groups.length; i++) {
        const memory = await createMemoryFromEntries(groups[i].entries);
        created.push(memory);
        setImporting({ done: i + 1, total: groups.length, fileName: "" });
      }
      setLocalMemories([...memories, ...created]);
      setImportToast(
        `${created.length} ${created.length === 1 ? t("map.photo.added") : t("map.photos.added")}`,
      );
    } catch {
      setImportToast(t("map.save.failed"));
    } finally {
      setImporting(null);
    }
  };

  /** Entry point for dragged / dropped files. */
  const importPhotos = async (files: File[]) => {
    const photos = files.filter(isPhotoFile);
    if (!photos.length) {
      setImportToast(t("map.import.hint"));
      return;
    }
    setImporting({ done: 0, total: photos.length, fileName: "" });
    try {
      const entries = await processFileMetadata(photos, (done, total, fileName) => {
        setImporting({ done, total, fileName });
      });

      const gps = entries.filter(
        (e) => e.metadata.lat !== undefined && e.metadata.lng !== undefined,
      );

      // If there are multiple distinct GPS locations, prompt the user
      if (gps.length > 1 && hasMixedGps(gps)) {
        setGpsConflict({ entries, photos });
        return;
      }

      await finishImport(entries, photos);
    } catch {
      setImportToast(t("map.save.failed"));
    } finally {
      setImporting(null);
    }
  };
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files.length)
      void importPhotos(Array.from(event.dataTransfer.files));
  };
  const toggleLinkPoint = (id: string) =>
    setLinkingIds((ids) =>
      ids
        ? ids.includes(id)
          ? ids.filter((item) => item !== id)
          : [...ids, id]
        : ids,
    );
  const saveThread = async () => {
    if (!linkingIds || linkingIds.length < 2) return;
    try {
      // Compute mixed color from linked memories
      const linkedMemories = memories.filter((m) => linkingIds.includes(m.id));
      const mixedColor = mixColors(linkedMemories.map((m) => m.color));

      // Update all linked memories with the mixed color
      const updatedMemories = memories.map((memory) =>
        linkingIds.includes(memory.id) ? { ...memory, color: mixedColor } : memory,
      );
      setLocalMemories(updatedMemories);

      // Persist color changes to API
      await Promise.all(
        linkingIds.map((id) =>
          fetch(`/api/memories/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ color: mixedColor }),
          }),
        ),
      );

      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryIds: linkingIds }),
      });
      if (res.ok) {
        const created: MemoryThread = await res.json();
        setLocalThreads([...threads, created]);
      }
    } catch {
      /* silent */
    }
    setLinkingIds(null);
    setShowThreads(true);
  };
  const deleteMemory = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    // Optimistic update
    const nextMemories = memories.filter(
      (memory) => memory.id !== targetId,
    );
    const nextThreads = threads
      .map((thread) => ({
        ...thread,
        memoryIds: thread.memoryIds.filter((id) => id !== targetId),
      }))
      .filter((thread) => thread.memoryIds.length > 1);
    setLocalMemories(nextMemories);
    setLocalThreads(nextThreads);
    setSelectedId(null);
    setDeleteTarget(null);
    setImportToast(t("map.deleted.toast", { title: deleteTarget.title }));
    try {
      await fetch(`/api/memories/${targetId}`, { method: "DELETE" });
    } catch {
      // Re-fetch to reconcile
      try {
        const [m, t] = await Promise.all([
          fetch("/api/memories").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/threads").then((r) => (r.ok ? r.json() : [])),
        ]);
        setLocalMemories(m as Memory[]);
        setLocalThreads(t as MemoryThread[]);
      } catch {
        /* silent */
      }
    }
  };
  // Close style picker on outside click
  useEffect(() => {
    if (!styleOpen) return;
    const onClick = (e: MouseEvent) => {
      if (stylePickerRef.current && !stylePickerRef.current.contains(e.target as Node)) {
        setStyleOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [styleOpen]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("life-trace-memory-state", {
        detail: memories.map(
          ({ id, title, place, date, color, favorite, image }) => ({
            id,
            title,
            place,
            date,
            color,
            favorite,
            image,
          }),
        ),
      }),
    );
  }, [memories]);
  // Demo mode: keep the map in sync with localStorage overrides (favorite,
  // delete) made from the details panel / memory page. Idempotent — returns
  // the same array reference when nothing changed, so no dispatch loop.
  useEffect(() => {
    if (!IS_DEMO) return;
    const onState = () => {
      setMemories((prev) => {
        const next = prev
          .map((m) => applyDemoOverrides(m))
          .filter((m) => !isDemoDeleted(m.id));
        if (
          next.length === prev.length &&
          next.every((m, i) => m === prev[i])
        ) {
          return prev;
        }
        return next;
      });
    };
    window.addEventListener("life-trace-memory-state", onState);
    return () => window.removeEventListener("life-trace-memory-state", onState);
  }, []);
  useEffect(() => {
    if (!importToast) return;
    const timeout = window.setTimeout(() => setImportToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [importToast]);
  return (
    <div
      className="map-page"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragActive(false);
      }}
      onDrop={handleDrop}
    >
      <MapCanvas
        memories={visible}
        threadMemories={memories}
        selectedId={selectedId}
        onSelect={(memory) => {
          setSelectedId(memory.id);
          window.dispatchEvent(
            new CustomEvent("life-trace-select", { detail: memory.id }),
          );
          if (linkingIds) toggleLinkPoint(memory.id);
        }}
        showGrid={showGrid}
        showThreads={showThreads}
        vivid={vivid}
        threads={threads}
        onMapClick={handleMapClick}
        linkingIds={stableLinkingIds}
        mapStyle={mapStyle}
      />
      <div className="map-topbar">
        <div className="view-switch">
          {linkingIds ? (
            <>
              <button
                className="is-active"
                onClick={saveThread}
                disabled={linkingIds.length < 2}
              >
                <Check size={14} />
                {t("map.save.thread")}
              </button>
              <button onClick={() => setLinkingIds(null)}>{t("map.exit.links")}</button>
            </>
          ) : showThreads ? (
            <button className="is-active" onClick={() => setShowThreads(false)}>
              <Link2 size={14} />
              {t("map.threads")} <span className="route-badge">{threads.length}</span>
            </button>
          ) : (
            <button onClick={() => setShowThreads(true)}>
              <Link2 size={14} />
              {t("map.threads")} <span className="route-badge">{threads.length}</span>
            </button>
          )}{" "}
          {!linkingIds && !showThreads && (
            <button
              onClick={() => {
                setSelectedId(null);
                setLinkingIds([]);
                window.dispatchEvent(
                  new CustomEvent("life-trace-select", { detail: null }),
                );
              }}
            >
              {t("map.link.memories")}
            </button>
          )}
        </div>
        <div className="map-style-picker" ref={stylePickerRef}>
          <button
            className="map-style-btn"
            onClick={() => setStyleOpen(!styleOpen)}
            title={t("map.customize")}
          >
            <SlidersHorizontal size={15} />
          </button>
          {styleOpen && (
            <div className="map-style-dropdown">
              {(Object.entries(MAP_STYLES) as [MapStyle, { label: string; icon: string }][]).map(([key, def]) => (
                <button
                  key={key}
                  className={`map-style-option ${mapStyle === key ? "is-active" : ""}`}
                  onClick={() => {
                    setMapStyle(key);
                    localStorage.setItem("life-trace-map-style", key);
                    setStyleOpen(false);
                  }}
                >
                  <span className="map-style-option-icon">{def.icon}</span>
                  <span className="map-style-option-label">{t(def.label)}</span>
                  {mapStyle === key && <span className="map-style-option-check">✓</span>}
                </button>
              ))}
              <div className="map-style-divider" />
              <button
                className={`map-style-option ${vivid ? "is-active" : ""}`}
                onClick={() => setVivid(!vivid)}
              >
                <span className="map-style-option-icon">{vivid ? "🎨" : "🖌️"}</span>
                <span className="map-style-option-label">{t("map.vivid")}</span>
                {vivid && <span className="map-style-option-check">✓</span>}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="map-floating-tools">
        <button
          title={t("map.toggle.grid")}
          className={showGrid ? "is-active" : ""}
          onClick={() => setShowGrid(!showGrid)}
        >
          <Layers3 size={17} />
        </button>
        {!IS_DEMO && (
          <button title={t("map.add.memory.title")} onClick={() => openCreate()}>
            <Upload size={16} />
          </button>
        )}
      </div>
      {!IS_DEMO && addMode && (
        <div className="add-mode-hint">
          <span className="add-mode-pulse" />
          {t("map.click.to.place")}{" "}
          <button onClick={() => setAddMode(false)}>{t("map.cancel")}</button>
        </div>
      )}
      {!IS_DEMO && pendingImport && (
        <div className="add-mode-hint">
          <span className="add-mode-pulse" />
          {t("map.click.to.place.photos")}{" "}
          <button onClick={() => setPendingImport(null)}>{t("map.cancel")}</button>
        </div>
      )}
      {!IS_DEMO && dragActive && (
        <div className="map-drop-overlay">
          <div className="map-drop-card">
            <Upload size={27} />
            <strong>{t("map.drop.photos")}</strong>
            <span>{t("map.drop.hint")}</span>
          </div>
        </div>
      )}
      {!IS_DEMO && importing && (
        <div className="map-import-toast">
          <span className="import-spinner" />
          <span className="import-progress-text">
            {t("map.reading.metadata")}
            <span className="import-progress-count">
              {importing.done}/{importing.total}
            </span>
            <span className="import-progress-file">
              {importing.fileName
                ? importing.fileName.length > 40
                  ? importing.fileName.slice(0, 37) + "…"
                  : importing.fileName
                : ""}
            </span>
          </span>
        </div>
      )}
      {!IS_DEMO && importToast && !importing && (
        <div className="map-import-toast map-import-toast--success">
          {importToast}
        </div>
      )}
      {!IS_DEMO && linkingIds && (
        <div className="link-mode-hint">
          <Link2 size={15} />
          <span>{t("map.link.hint")}</span>
          <strong>{linkingIds.length} {t("map.link.selected")}</strong>
          <button onClick={() => setLinkingIds(null)}>{t("map.cancel")}</button>
        </div>
      )}
      <div className="map-context">
        <span className="context-kicker">{t("map.your.archive")}</span>
        <strong>{activeYear === "all" ? t("map.everywhere") : activeYear}</strong>
        <span className="context-count">{visible.length} {t("map.memories")}</span>
        {!memories.length && (
          <small className="empty-map-hint">
            {t("map.empty.hint")}
          </small>
        )}
      </div>
      {!IS_DEMO && portalContainer && deleteTarget && createPortal(
        <div
          className="delete-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("map.delete.confirm.dialog")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="delete-modal-card">
            <div className="delete-modal-icon">
              <Trash2 size={20} />
            </div>
            <span className="eyebrow">{t("map.delete.title")}</span>
            <h2>{t("map.delete.confirm", { title: deleteTarget.title })}</h2>
            <p>
              {t("map.delete.desc", { count: deleteTarget.media?.length || 0 })}
            </p>
            <div className="delete-modal-actions">
              <button onClick={() => setDeleteTarget(null)}>{t("map.delete.keep")}</button>
              <button className="delete-confirm" onClick={deleteMemory}>
                {t("map.delete.permanently")}
              </button>
            </div>
          </div>
        </div>,
        portalContainer,
      )}
      {!IS_DEMO && portalContainer && gpsConflict && createPortal(
        <div
          className="gps-conflict-modal"
          role="dialog"
          aria-modal="true"
          aria-label={t("map.gps.conflict.title")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setGpsConflict(null);
          }}
        >
          <div className="gps-conflict-card">
            <div className="gps-conflict-icon">
              <Layers3 size={20} />
            </div>
            <span className="eyebrow">{t("map.gps.conflict.title")}</span>
            <h2>{t("map.gps.conflict.heading")}</h2>
            <p>
              {t("map.gps.conflict.desc", { count: gpsConflict.entries.length })}
            </p>
            <div className="gps-conflict-actions">
              <button className="gps-conflict-merge" onClick={handleGpsMerge}>
                <strong>{t("map.gps.conflict.merge")}</strong>
                <small>{t("map.gps.conflict.merge.hint")}</small>
              </button>
              <button className="gps-conflict-split" onClick={handleGpsSplit}>
                <strong>{t("map.gps.conflict.split")}</strong>
                <small>{t("map.gps.conflict.split.hint")}</small>
              </button>
            </div>
            <button className="gps-conflict-cancel" onClick={() => setGpsConflict(null)}>
              {t("map.cancel")}
            </button>
          </div>
        </div>,
        portalContainer,
      )}
      {!IS_DEMO && portalContainer && form && createPortal(
        <div className="memory-modal">
          <div className="memory-modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow">{editingId ? t("map.form.edit") : t("map.form.new")}</span>
                <h2>{editingId ? t("map.form.edit.title") : t("map.form.new.title")}</h2>
              </div>
              <button onClick={() => { setForm(null); setEditingId(null); setPickingLocation(null); pendingMediaRef.current = null; }}>
                <X size={17} />
              </button>
            </div>
            <label
              className="cover-picker"
              style={
                form.cover
                  ? { backgroundImage: `url(${form.cover})` }
                  : undefined
              }
            >
              <input
                type="file"
                accept="image/*,.heic,.heif"
                onChange={setCover}
              />
              {!form.cover && (
                <>
                  <Upload size={18} />
                  <span>{t("map.form.cover")}</span>
                </>
              )}
            </label>
            <input
              autoFocus
              placeholder={t("map.form.title.placeholder")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              placeholder={t("map.form.place.placeholder")}
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value })}
            />
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <div className="modal-coordinates">
              {form.lat}° lat · {form.lng}° lng
              {form.city || form.country ? ` · ${[form.city, form.country].filter(Boolean).join(", ")}` : ""}
              <button
                type="button"
                className="pick-location-btn"
                onClick={() => {
                  setPickingLocation(form);
                  setForm(null);
                  setAddMode(true);
                }}
              >
                {t("map.pick.location")}
              </button>
            </div>
            <div className="modal-tags">
              <span className="eyebrow">{t("tags.label")}</span>
              <TagInput
                tags={form.tags}
                onChange={(tags) => setForm({ ...form, tags })}
                placeholder={t("tags.placeholder")}
                existingTags={allTags}
              />
            </div>
            <div className="modal-color-picker">
              <span className="eyebrow">{t("map.form.color")}</span>
              <div className="color-swatches">
                {PIN_SYMBOLS.map((s) => s.id === "pin" ? null : s.id).filter(Boolean).map((id) => null)}
                {["#ef766b", "#c6535b", "#8b6bb3", "#3f8290", "#b47b3f", "#668d68", "#9a6480", "#d4a574", "#5a9bd8", "#c472b9"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${form.color === color ? "is-active" : ""}`}
                    style={{ background: color }}
                    onClick={() => setForm({ ...form, color })}
                    aria-label={color}
                    aria-pressed={form.color === color}
                  />
                ))}
              </div>
            </div>
            <div className="modal-symbol-picker">
              <span className="eyebrow">{t("map.form.symbol")}</span>
              <div className="symbol-grid">
                {PIN_SYMBOLS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`symbol-btn ${form.symbol === s.id ? "is-active" : ""}`}
                    onClick={() => setForm({ ...form, symbol: s.id })}
                    aria-label={s.id}
                    aria-pressed={form.symbol === s.id}
                  >
                    <span className="symbol-icon">{s.icon}</span>
                    <span className="symbol-label">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button className="modal-submit" onClick={save}>
              {editingId ? t("map.form.save.changes") : t("map.form.save.memory")}
            </button>
          </div>
        </div>,
        portalContainer,
      )}
    </div>
  );
}
