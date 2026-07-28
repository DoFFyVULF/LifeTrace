/**
 * Web Worker: photo-metadata.worker
 *
 * Receives file buffers via postMessage and returns EXIF metadata.
 * Runs off the main thread so the UI stays responsive during import.
 *
 * @example
 * ```ts
 * const worker = new Worker(
 *   new URL("./photo-metadata.worker", import.meta.url),
 *   { type: "module" },
 * );
 * ```
 *
 * Message shape (main → worker):
 *   { id: number; buffer: ArrayBuffer; fileName: string; fileType: string; lastModified: number }
 *
 * Message shape (worker → main):
 *   { id: number; metadata: PhotoMetadata }
 */

import { readMetadataFromBuffer } from "./photo-metadata";

self.onmessage = async (event: MessageEvent) => {
  const { id, buffer, fileName, fileType, lastModified } = event.data;

  try {
    const metadata = await readMetadataFromBuffer(
      buffer,
      fileName,
      fileType,
      lastModified,
    );
    self.postMessage({ id, metadata });
  } catch {
    // Graceful degradation — return fallback date
    self.postMessage({
      id,
      metadata: {
        date: new Date(lastModified || Date.now())
          .toISOString()
          .slice(0, 10),
      },
    });
  }
};
