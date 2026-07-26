import type { Collection } from "./types";

const BASE = "/api/collections";

export async function list(): Promise<Collection[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to fetch collections");
  return res.json();
}

export async function create(name: string, memoryIds: string[]): Promise<Collection> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, memoryIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create collection");
  }
  return res.json();
}

export async function remove(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete collection");
  }
}
