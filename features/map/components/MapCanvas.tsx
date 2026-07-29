"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { isMediaSrc } from "@/lib/media";

export type MapStyle = "light" | "dark" | "satellite" | "vintage";

const TILES: Record<MapStyle, {
  tiles: string[];
  tileSize: number;
  attribution: string;
  paint: Record<string, number | string | boolean | undefined>;
}> = {
  light: {
    tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"],
    tileSize: 256,
    attribution: "© CARTO, © OpenStreetMap contributors",
    paint: {
      "raster-saturation": 0.12,
      "raster-contrast": -0.04,
      "raster-brightness-min": 0.15,
      "raster-brightness-max": 1,
      "raster-opacity": 0.92,
    },
  },
  dark: {
    tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
    tileSize: 256,
    attribution: "© CARTO, © OpenStreetMap contributors",
    paint: {
      "raster-saturation": -0.15,
      "raster-contrast": 0.06,
      "raster-brightness-min": 0.08,
      "raster-brightness-max": 0.92,
      "raster-opacity": 0.95,
    },
  },
  satellite: {
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
    attribution:
      "© Esri, Maxar, Earthstar Geographics and the GIS User Community",
    paint: {
      "raster-saturation": -0.08,
      "raster-contrast": 0.02,
      "raster-opacity": 1,
    },
  },
  vintage: {
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    tileSize: 256,
    attribution: "© OpenStreetMap contributors",
    paint: {
      "raster-saturation": 0.35,
      "raster-contrast": 0.12,
      "raster-brightness-min": 0.18,
      "raster-brightness-max": 0.95,
      "raster-opacity": 0.88,
    },
  },
};

const LAYER_ID = "map-raster";
const SOURCE_ID = "map-tiles";

function buildStyle(style: MapStyle): maplibregl.StyleSpecification {
  const t = TILES[style];
  return {
    version: 8,
    sources: {
      [SOURCE_ID]: {
        type: "raster",
        tiles: t.tiles,
        tileSize: t.tileSize,
        attribution: t.attribution,
      },
    },
    layers: [
      {
        id: LAYER_ID,
        type: "raster",
        source: SOURCE_ID,
        paint: t.paint,
      },
    ],
  };
}

function getSymbolIcon(symbol: string): string {
  const icons: Record<string, string> = {
    pin: "📍", heart: "♥", star: "★", flag: "🚩",
    diamond: "◆", square: "■", circle: "●",
    home: "🏠", camera: "📷", music: "♪",
  };
  return icons[symbol] || "📍";
}

export type Memory = {
  id: string; title: string; place: string; date: string; year: string;
  lng: number; lat: number; color: string; kind: string; image: string;
  media?: string[]; favorite?: boolean; symbol?: string;
  city?: string | null; country?: string | null; tags?: string[];
};
export type MemoryThread = { id: string; memoryIds: string[] };

type Props = {
  memories: Memory[];
  threadMemories: Memory[];
  selectedId: string | null;
  onSelect: (memory: Memory) => void;
  showGrid: boolean;
  showThreads: boolean;
  vivid: boolean;
  threads: MemoryThread[];
  onMapClick: (lng: number, lat: number) => void;
  linkingIds: string[];
  mapStyle: MapStyle;
};

const threadPalette = [
  "#c6535b", "#8b6bb3", "#3f8290",
  "#b47b3f", "#668d68", "#9a6480",
];

export function MapCanvas({
  memories, threadMemories, selectedId, onSelect,
  showGrid, showThreads, vivid, threads, onMapClick, linkingIds,
  mapStyle,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const dyingMarkersRef = useRef<maplibregl.Marker[]>([]);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSelectRef = useRef(onSelect);
  const [mapReady, setMapReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Кэш размеров canvas — обновляется только при resize
  const canvasSizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  const setCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    ctxRef.current = el?.getContext("2d", { willReadFrequently: false }) ?? null;
  }, []);

  const threadDataRef = useRef<{ memories: Memory[]; color: string }[]>([]);

  const visibleThreads = useMemo(() => {
    const preview =
      linkingIds.length > 1
        ? [{ id: "thread-preview", memoryIds: linkingIds }]
        : [];
    return [...threads, ...preview];
  }, [threads, linkingIds]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // ──────────────────────────────────────────────
  // drawThreads — синхронная, без rAF-обёртки
  // ──────────────────────────────────────────────
  const drawThreads = useCallback(() => {
    const map = mapRef.current;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!map || !ctx || !canvas) return;

    const data = threadDataRef.current;
    const { w, h, dpr } = canvasSizeRef.current;
    if (!w || !h) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = w / dpr;
    const ch = h / dpr;
    ctx.clearRect(0, 0, cw, ch);

    if (!data.length) return;

    for (const seg of data) {
      const pts = seg.memories.map((m) => map.project([m.lng, m.lat]));

      // Culling: нить целиком за экраном
      const allOff = pts.every(
        (p) => p.x < -50 || p.x > cw + 50 || p.y < -50 || p.y > ch + 50,
      );
      if (allOff) continue;

      // Тень
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = "rgba(255, 241, 237, 0.96)";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Пунктир
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([2, 10]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Узлы
      for (const p of pts) {
        if (p.x < -20 || p.x > cw + 20 || p.y < -20 || p.y > ch + 20) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.strokeStyle = "#fff7f2";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }, []);

  // Build thread data
  useEffect(() => {
    threadDataRef.current = (() => {
      if (!showThreads) return [];
      const result: { memories: Memory[]; color: string }[] = [];
      for (const thread of visibleThreads) {
        const mems: Memory[] = [];
        for (const id of thread.memoryIds) {
          const memory = threadMemories.find((m) => m.id === id);
          if (memory) mems.push(memory);
        }
        if (mems.length < 2) continue;
        result.push({ memories: mems, color: mems[0]?.color || threadPalette[0] });
      }
      return result;
    })();
    drawThreads();
  }, [showThreads, visibleThreads, threadMemories, drawThreads]);

  // Обновление кэша размеров canvas
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvasSizeRef.current = { w, h, dpr };
  }, []);

  // ──────────────────────────────────────────────
  // Init map
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(mapStyle),
      center: [28, 35],
      zoom: 2.25,
      minZoom: 1.4,
      maxZoom: 18,
      attributionControl: { compact: true },
      fadeDuration: 0,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
    map.addControl(new maplibregl.FullscreenControl(), "bottom-right");

    map.on("click", (event) => {
      const target = event.originalEvent.target;
      if (target instanceof HTMLElement && target.closest(".real-map-pin")) return;
      onMapClick(event.lngLat.lng, event.lngLat.lat);
    });

    map.on("load", () => {
      updateCanvasSize();
      requestAnimationFrame(() => map.resize());
      setTimeout(() => map.resize(), 250);
      setMapReady(true);
      drawThreads();
    });

    map.on("move", drawThreads);

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      updateCanvasSize();
      drawThreads();
    });
    resizeObserver.observe(containerRef.current);

    const resizeMap = () => {
      map.resize();
      updateCanvasSize();
      drawThreads();
    };
    requestAnimationFrame(() => {
      resizeMap();
      requestAnimationFrame(resizeMap);
    });
    const initialResize = window.setTimeout(resizeMap, 500);
    window.addEventListener("resize", resizeMap);

    mapRef.current = map;

    return () => {
      window.clearTimeout(initialResize);
      window.removeEventListener("resize", resizeMap);
      resizeObserver.disconnect();
      map.off("move", drawThreads);
      markersRef.current.forEach((m) => m.remove());
      dyingMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMapClick]);

  // ── Dynamic style switching via layer/source swap ──────────────
  // Instead of map.setStyle() (which destroys everything), we just
  // swap the raster source and layer in-place. Markers keep working.
  const appliedStyleRef = useRef<MapStyle>(mapStyle);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (appliedStyleRef.current === mapStyle) return;
    appliedStyleRef.current = mapStyle;

    const t = TILES[mapStyle];

    // Remove existing layer + source (must remove layer first)
    if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    // Add new source + layer
    map.addSource(SOURCE_ID, {
      type: "raster",
      tiles: t.tiles,
      tileSize: t.tileSize,
      attribution: t.attribution,
    });
    map.addLayer({
      id: LAYER_ID,
      type: "raster",
      source: SOURCE_ID,
      paint: t.paint,
    });

    // Repaint canvas overlay after tiles start loading
    updateCanvasSize();
    drawThreads();
  }, [mapStyle, drawThreads, updateCanvasSize, mapReady]);

  // flyTo selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId) return;
    const memory = threadMemories.find((item) => item.id === selectedId);
    if (memory)
      map.flyTo({
        center: [memory.lng, memory.lat],
        zoom: Math.max(map.getZoom(), 5.2),
        duration: 1100,
        essential: true,
      });
  }, [selectedId, threadMemories, mapReady]);

  // focus event
  useEffect(() => {
    const focus = (event: Event) => {
      const map = mapRef.current;
      const memory = threadMemories.find(
        (item) => item.id === (event as CustomEvent<string>).detail,
      );
      if (map && memory)
        map.flyTo({
          center: [memory.lng, memory.lat],
          zoom: Math.max(map.getZoom(), 5.2),
          duration: 1100,
          essential: true,
        });
    };
    window.addEventListener("life-trace-focus-memory", focus);
    return () => window.removeEventListener("life-trace-focus-memory", focus);
  }, [threadMemories]);

  // Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (fadeTimerRef.current !== null) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    const oldMarkers = markersRef.current;
    markersRef.current = [];

    oldMarkers.forEach((marker) => {
      const el = marker.getElement();
      el.style.transition = "opacity 0.3s ease";
      el.style.opacity = "0";
    });
    dyingMarkersRef.current.push(...oldMarkers);

    if (dyingMarkersRef.current.length) {
      fadeTimerRef.current = setTimeout(() => {
        dyingMarkersRef.current.forEach((m) => m.remove());
        dyingMarkersRef.current = [];
        fadeTimerRef.current = null;
      }, 350);
    }

    memories.forEach((memory) => {
      const element = document.createElement("button");
      element.type = "button";
      const sym = memory.symbol || "pin";
      element.className = `real-map-pin ${linkingIds.includes(memory.id) ? "is-linking" : ""} real-map-pin--${sym}${sym !== "pin" ? " real-map-pin--custom" : ""}`;
      element.style.setProperty("--pin-color", memory.color);
      element.dataset.memoryId = memory.id;
      element.dataset.memoryYear = memory.year || "";

      if (sym === "pin") {
        element.innerHTML = `<span class="pin-orbit-ring"><span class="pin-orbit pin-orbit--one"></span><span class="pin-orbit pin-orbit--two"></span><span class="pin-orbit pin-orbit--three"></span></span>`;
      } else {
        element.innerHTML = `<span class="pin-symbol">${getSymbolIcon(sym)}</span>`;
      }

      const orbitImages = (memory.media?.filter((src) => isMediaSrc(src)) ?? []).slice(0, 3);
      const cover = isMediaSrc(memory.image) ? memory.image : "";
      element.querySelectorAll<HTMLElement>(".pin-orbit").forEach((orbit, index) => {
        const image = orbitImages[index] || orbitImages[0] || cover;
        if (image)
          orbit.style.backgroundImage = `linear-gradient(145deg, rgba(36,55,53,.05), rgba(36,55,53,.22)), url("${image}")`;
        orbit.setAttribute("aria-label", `${memory.title}${memory.place ? `, ${memory.place}` : ""}`);
      });

      element.setAttribute("aria-label", memory.title);

      const stop = (e: Event) => e.stopPropagation();
      element.addEventListener("pointerdown", stop);
      element.addEventListener("pointermove", stop);
      element.addEventListener("mousedown", stop);
      element.addEventListener("dblclick", stop);

      element.onclick = (e) => {
        e.stopPropagation();
        onSelectRef.current(memory);
        map.flyTo({
          center: [memory.lng, memory.lat],
          zoom: Math.max(map.getZoom(), 4.5),
          duration: 900,
        });
      };

      element.style.opacity = "0";
      markersRef.current.push(
        new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat([memory.lng, memory.lat])
          .addTo(map),
      );
    });

    requestAnimationFrame(() => {
      markersRef.current.forEach((marker) => {
        const el = marker.getElement();
        el.style.transition = "opacity 0.35s ease";
        el.style.opacity = "1";
      });
      setTimeout(() => {
        markersRef.current.forEach((marker) => {
          marker.getElement().style.transition = "none";
        });
      }, 400);
    });

    return () => {
      if (fadeTimerRef.current !== null) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      dyingMarkersRef.current.forEach((m) => m.remove());
      dyingMarkersRef.current = [];
    };
  }, [memories, linkingIds, mapReady]);

  // Selected highlight
  useEffect(() => {
    markersRef.current.forEach((marker) => {
      marker.getElement().classList.toggle(
        "is-active",
        marker.getElement().dataset.memoryId === selectedId,
      );
    });
  }, [selectedId, mapReady]);

  return (
    <div
      className={`real-map ${vivid ? "real-map--vivid" : ""} ${showGrid ? "real-map--grid" : ""} real-map--${mapStyle}`}
      aria-label="Реальная интерактивная карта воспоминаний"
    >
      <div className="maplibre-host" ref={containerRef} />
      <canvas
        ref={setCanvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </div>
  );
}
