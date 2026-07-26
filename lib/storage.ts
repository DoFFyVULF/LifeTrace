import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

/** Absolute path to the uploads directory. */
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
  heic: "image/heic",
  heif: "image/heif",
};

function extFromPath(filePath: string): string {
  const ext = path.extname(filePath).replace(/^\./, "").toLowerCase();
  return ext || "bin";
}

/** Resolve content-type from file extension. */
export function contentType(filePath: string): string {
  return MIME_MAP[extFromPath(filePath)] || "application/octet-stream";
}

/**
 * Guard against path-traversal attacks.
 * The `segments` come from a URL catch-all param and should not contain `..`.
 */
export function assertSafeSegments(segments: string[]): void {
  for (const s of segments) {
    if (s === ".." || s === "." || s.includes("/") || s.includes("\\")) {
      throw new Error("Invalid path segment");
    }
  }
}

/**
 * Resolve an absolute filesystem path from URL path segments.
 * Guards against traversal — throws on unsafe input.
 */
export function resolveUploadPath(segments: string[]): string {
  assertSafeSegments(segments);
  return path.resolve(UPLOAD_DIR, ...segments);
}

/** Ensure that a directory exists (create parents if needed). */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
}

/**
 * Write a file buffer to disk under `uploads/` with a unique name.
 * Returns the relative URL path (e.g. `/api/media/2026/07/cuid.jpg`).
 *
 * Directory structure: `uploads/<year>/<month>/`.
 */
export function saveUpload(
  buffer: Buffer | Uint8Array,
  originalName: string,
): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ext = extFromPath(originalName);
  // Use crypto.randomUUID() for the filename part
  const fileName = `${randomUUID()}.${ext}`;
  const relativeDir = path.join(year, month);
  const dirPath = path.join(UPLOAD_DIR, relativeDir);

  ensureDir(dirPath);
  writeFileSync(path.join(dirPath, fileName), buffer);

  // Return URL path: /api/media/<year>/<month>/<filename>
  return `/api/media/${year}/${month}/${fileName}`;
}

/**
 * Generate a file-safe extension from the original file name.
 * Used to preserve extension for content-type resolution.
 */
export function safeExtension(fileName: string): string {
  const ext = path.extname(fileName).replace(/^\./, "").toLowerCase();
  return ext || "bin";
}

/**
 * Delete a media file from disk given its URL path.
 * Accepts paths like `/api/media/2026/07/uuid.jpg`.
 * Returns true if deleted, false if not found.
 */
export function deleteMediaFile(mediaUrl: string): boolean {
  const rel = mediaUrl.replace(/^\/api\/media\//, "");
  const segments = rel.split("/").filter(Boolean);
  if (!segments.length) return false;
  const filePath = resolveUploadPath(segments);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

/**
 * Read a media file from disk and return { buffer, contentType }.
 */
export async function readMedia(
  segments: string[],
): Promise<{ buffer: Buffer; contentType: string }> {
  const filePath = resolveUploadPath(segments);
  const ext = path.extname(filePath);
  const ct = MIME_MAP[ext.replace(/^\./, "").toLowerCase()] || "application/octet-stream";
  const buffer = await readFile(filePath);
  return { buffer, contentType: ct };
}
