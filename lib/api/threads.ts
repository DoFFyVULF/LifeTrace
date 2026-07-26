import type { MemoryThread } from "./types";

const BASE = "/api/threads";

export async function list(): Promise<MemoryThread[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to fetch threads");
  return res.json();
}

export async function create(memoryIds: string[]): Promise<MemoryThread> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memoryIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create thread");
  }
  return res.json();
}

export async function remove(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete thread");
  }
}
