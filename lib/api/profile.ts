import type { Profile } from "./types";

const BASE = "/api/profile";

export async function get(): Promise<Profile> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

export async function update(data: { name?: string; avatarPath?: string }): Promise<Profile> {
  const res = await fetch(BASE, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update profile");
  }
  return res.json();
}
