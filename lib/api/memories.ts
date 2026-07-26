import type { Memory } from "./types";

const BASE = "/api/memories";

export async function list(options?: {
  filter?: "favorites";
  search?: string;
}): Promise<Memory[]> {
  const params = new URLSearchParams();
  if (options?.filter) params.set("filter", options.filter);
  if (options?.search) params.set("search", options.search);
  const qs = params.toString();
  const res = await fetch(qs ? `${BASE}?${qs}` : BASE);
  if (!res.ok) throw new Error("Failed to fetch memories");
  return res.json();
}

export async function get(id: string): Promise<Memory> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Memory not found");
  return res.json();
}

export async function create(memory: Omit<Memory, "id" | "year" | "createdAt" | "updatedAt">): Promise<Memory> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(memory),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create memory");
  }
  return res.json();
}

export async function update(
  id: string,
  data: Partial<Memory>,
): Promise<Memory> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update memory");
  }
  return res.json();
}

export async function remove(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete memory");
  }
}
