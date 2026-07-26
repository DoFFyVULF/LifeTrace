"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type Memory = {
  id: string;
  title: string;
  place: string;
  date: string;
  year: string;
  lng: number;
  lat: number;
  color: string;
  kind: string;
  image: string;
  media?: string[];
  favorite?: boolean;
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
};

const style: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-saturation": -0.55,
        "raster-contrast": -0.08,
        "raster-brightness-min": 0.2,
        "raster-brightness-max": 0.98,
        "raster-opacity": 0.86,
      },
    },
  ],
};
const threadPalette = [
  "#c6535b",
  "#8b6bb3",
  "#3f8290",
  "#b47b3f",
  "#668d68",
  "#9a6480",
];

export function MapCanvas({
  memories,
  threadMemories,
  selectedId,
  onSelect,
  showGrid,
  showThreads,
  vivid,
  threads,
  onMapClick,
  linkingIds,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const visibleThreads = useMemo(() => {
    const preview =
      linkingIds.length > 1
        ? [{ id: "thread-preview", memoryIds: linkingIds }]
        : [];
    return [...threads, ...preview];
  }, [threads, linkingIds]);
  const updateThreadOverlay = useCallback(
    () => setMapVersion((version) => version + 1),
    [],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [28, 35],
      zoom: 2.25,
      minZoom: 1.4,
      maxZoom: 18,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "bottom-right",
    );
    map.addControl(new maplibregl.FullscreenControl(), "bottom-right");
    map.on("click", (event) => {
      const target = event.originalEvent.target;
      if (target instanceof HTMLElement && target.closest(".real-map-pin"))
        return;
      onMapClick(event.lngLat.lng, event.lngLat.lat);
    });
    map.on("load", () => {
      requestAnimationFrame(() => map.resize());
      setTimeout(() => map.resize(), 250);
      setMapReady(true);
      updateThreadOverlay();
    });
    map.on("move", updateThreadOverlay);
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
      updateThreadOverlay();
    });
    resizeObserver.observe(containerRef.current);
    const resizeMap = () => {
      map.resize();
      updateThreadOverlay();
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
      map.off("move", updateThreadOverlay);
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [onMapClick, updateThreadOverlay]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId) return;
    const memory = threadMemories.find((item) => item.id === selectedId);
    if (memory) map.flyTo({ center: [memory.lng, memory.lat], zoom: Math.max(map.getZoom(), 5.2), duration: 1100, essential: true });
  }, [selectedId, threadMemories, mapReady]);

  useEffect(() => {
    const focus = (event: Event) => {
      const map = mapRef.current;
      const memory = threadMemories.find((item) => item.id === (event as CustomEvent<string>).detail);
      if (map && memory) map.flyTo({ center: [memory.lng, memory.lat], zoom: Math.max(map.getZoom(), 5.2), duration: 1100, essential: true });
    };
    window.addEventListener("life-trace-focus-memory", focus);
    return () => window.removeEventListener("life-trace-focus-memory", focus);
  }, [threadMemories]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const clear = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
    clear();
    memories.forEach((memory) => {
      const element = document.createElement("button");
      element.className = `real-map-pin ${selectedId === memory.id ? "is-active" : ""} ${linkingIds.includes(memory.id) ? "is-linking" : ""}`;
      element.innerHTML = `<span class="pin-orbit-ring"><span class="pin-orbit pin-orbit--one"></span><span class="pin-orbit pin-orbit--two"></span><span class="pin-orbit pin-orbit--three"></span></span>`;
      element.style.setProperty("--pin-color", memory.color);
      const orbitImages = (
        memory.media?.filter(
          (src) => src.startsWith("data:") || src.startsWith("http"),
        ) ?? []
      ).slice(0, 3);
      const cover =
        memory.image?.startsWith("data:") || memory.image?.startsWith("http")
          ? memory.image
          : "";
      element
        .querySelectorAll<HTMLElement>(".pin-orbit")
        .forEach((orbit, index) => {
          const image = orbitImages[index] || orbitImages[0] || cover;
          if (image)
            orbit.style.backgroundImage = `linear-gradient(145deg, rgba(36,55,53,.05), rgba(36,55,53,.22)), url("${image}")`;
          orbit.setAttribute(
            "aria-label",
            `${memory.title}${memory.place ? `, ${memory.place}` : ""}`,
          );
        });
      element.setAttribute("aria-label", memory.title);
      element.onclick = (event) => {
        event.stopPropagation();
        onSelect(memory);
        map.flyTo({
          center: [memory.lng, memory.lat],
          zoom: Math.max(map.getZoom(), 4.5),
          duration: 900,
        });
      };
      markersRef.current.push(
        new maplibregl.Marker({ element, anchor: "center" })
          .setLngLat([memory.lng, memory.lat])
          .addTo(map),
      );
    });
    const threadId = "memory-threads";
    const threadLines = visibleThreads.flatMap((thread) => {
      const points = thread.memoryIds
        .map((id) => threadMemories.find((memory) => memory.id === id))
        .filter((memory): memory is Memory => Boolean(memory));
      return points.length > 1
        ? [
            {
              type: "Feature" as const,
              properties: { id: thread.id },
              geometry: {
                type: "LineString" as const,
                coordinates: points.map((memory) => [memory.lng, memory.lat]),
              },
            },
          ]
        : [];
    });
    const threadData = {
      type: "FeatureCollection" as const,
      features: threadLines,
    };
    const drawThreads = () => {
      if (map.getSource(threadId))
        (map.getSource(threadId) as maplibregl.GeoJSONSource).setData(
          threadData,
        );
      else {
        map.addSource(threadId, { type: "geojson", data: threadData });
        map.addLayer({
          id: `${threadId}-shadow`,
          type: "line",
          source: threadId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#fff1ed",
            "line-width": 7,
            "line-opacity": showThreads ? 0.88 : 0,
          },
        });
        map.addLayer({
          id: threadId,
          type: "line",
          source: threadId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#c53f4a",
            "line-width": 3.5,
            "line-dasharray": [1.2, 1.6],
            "line-opacity": showThreads ? 1 : 0,
          },
        });
      }
    };
    if (map.isStyleLoaded()) drawThreads();
    else map.once("load", drawThreads);
    if (map.getLayer(`${threadId}-shadow`))
      map.setPaintProperty(
        `${threadId}-shadow`,
        "line-opacity",
        showThreads ? 0.88 : 0,
      );
    if (map.getLayer(threadId))
      map.setPaintProperty(threadId, "line-opacity", showThreads ? 1 : 0);
    return clear;
  }, [
    memories,
    threadMemories,
    selectedId,
    onSelect,
    showThreads,
    visibleThreads,
    linkingIds,
    mapReady,
  ]);

  const overlayPaths = useMemo(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !showThreads) return [];
    return visibleThreads.flatMap((thread) => {
      const points = thread.memoryIds
        .map((id) => threadMemories.find((memory) => memory.id === id))
        .filter((memory): memory is Memory => Boolean(memory));
      if (points.length < 2) return [];
      return [
        {
          points: points.map((memory) => map.project([memory.lng, memory.lat])),
          memories: points,
        },
      ];
    });
  }, [mapReady, mapVersion, showThreads, threadMemories, visibleThreads]);

  return (
    <div
      className={`real-map ${vivid ? "real-map--vivid" : ""} ${showGrid ? "real-map--grid" : ""}`}
      aria-label="Реальная интерактивная карта воспоминаний"
    >
      <div className="maplibre-host" ref={containerRef} />
      {overlayPaths.length > 0 && (
        <svg className="thread-overlay" aria-hidden="true">
          {overlayPaths.map(
            ({ points, memories: connectedMemories }, index) => {
              const color = threadPalette[index % threadPalette.length];
              return (
                <g key={index}>
                  <polyline
                    className="thread-overlay-shadow"
                    points={points
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                  />
                  <polyline
                    className="thread-overlay-line"
                    style={{ stroke: color }}
                    points={points
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                  />
                  {points.map((point, pointIndex) => (
                    <circle
                      key={`${index}-${pointIndex}`}
                      className="thread-overlay-node"
                      cx={point.x}
                      cy={point.y}
                      r="8"
                      fill={color}
                      stroke={connectedMemories[pointIndex].color}
                    />
                  ))}
                </g>
              );
            },
          )}
        </svg>
      )}
    </div>
  );
}
