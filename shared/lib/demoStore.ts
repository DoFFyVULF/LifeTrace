"use client";

import { IS_DEMO } from "@/shared/lib/demo";

/**
 * Demo-mode persistence layer.
 *
 * In demo mode there is no database, so mutations can't hit PATCH/DELETE.
 * This module keeps per-memory overrides in localStorage so the demo UI
 * stays fully interactive (favorite, edit, delete) for the current browser.
 *
 * Shape:
 *   {
 *     [memoryId]: { deleted: true } | { ...partial fields to merge }
 *   }
 */

const STORAGE_KEY = "life-trace-demo-overrides";

type DemoPatch = Record<string, unknown>;

function readAll(): Record<string, DemoPatch> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, DemoPatch>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* storage full / private mode — best effort */
  }
}

/** Merge demo overrides (favorite, title, …) into a memory object. */
export function applyDemoOverrides<T extends { id: string }>(memory: T): T {
  if (!IS_DEMO) return memory;
  const patch = readAll()[memory.id];
  if (!patch || patch.deleted) return memory;
  return { ...memory, ...patch } as T;
}

/** True when the memory was deleted inside the demo session. */
export function isDemoDeleted(id: string): boolean {
  if (!IS_DEMO) return false;
  return readAll()[id]?.deleted === true;
}

/** Persist a partial update for a memory (demo only). */
export function saveDemoPatch(id: string, patch: Record<string, unknown>) {
  if (!IS_DEMO) return;
  const all = readAll();
  all[id] = { ...(all[id] || {}), ...patch };
  delete all[id].deleted;
  writeAll(all);
}

/** Mark a memory as deleted inside the demo session. */
export function deleteDemoMemory(id: string) {
  if (!IS_DEMO) return;
  const all = readAll();
  all[id] = { deleted: true };
  writeAll(all);
}
