/**
 * Client-side helpers for reading photo metadata via a Web Worker.
 *
 * Usage:
 * ```ts
 * import { processFileMetadata } from "@/lib/photo-metadata.client";
 *
 * const results = await processFileMetadata(files, (done, total, name) => {
 *   console.log(`${done}/${total}: ${name}`);
 * });
 * ```
 */

import type { PhotoMetadata } from "./photo-metadata";

/** Per-file result after metadata + upload. */
export type FileMetadataResult = {
  /** Served URL of the uploaded file. */
  url: string;
  /** EXIF / fallback metadata. */
  metadata: PhotoMetadata;
  /** Short file name for display. */
  fileName: string;
};

type ProgressCallback = (done: number, total: number, currentFile: string) => void;

/**
 * Process a batch of photos:
 *  1. Prepare & upload each file (canvas resize / HEIC decode → server)
 *  2. Read EXIF metadata off the main thread via a Web Worker
 *  3. Report progress as each photo finishes
 *
 * Returns results in the same order as `files`.
 */
export async function processFileMetadata(
  files: File[],
  onProgress?: ProgressCallback,
): Promise<FileMetadataResult[]> {
  if (!files.length) return [];

  // Lazy-import media helpers so this module can be tree-shaken
  // when imported from a worker context (unused there).
  const { prepareUpload, uploadMedia } = await import("./media");

  // 1. Upload all files in parallel — I/O bound, non-blocking
  //    (canvas resize / HEIC decode runs on the main thread but
  //     yields between frames via the microtask queue).
  const uploadResults = await Promise.all(
    files.map(async (file) => {
      const { blob, name } = await prepareUpload(file);
      const url = await uploadMedia(blob, name);
      return { file, url, name };
    }),
  );

  // 2. Spawn the Web Worker for EXIF parsing
  const worker = new Worker(
    new URL("./photo-metadata.worker.ts", import.meta.url),
    { type: "module" },
  );

  const results: FileMetadataResult[] = [];
  const total = files.length;

  try {
    // 3. Read EXIF metadata one file at a time via the worker.
    //    Sequential processing keeps the UI responsive (progress
    //    updates between each file) and avoids OOM from holding
    //    many large ArrayBuffers simultaneously.
    for (let i = 0; i < uploadResults.length; i++) {
      const { file, url, name } = uploadResults[i];

      // Read file as ArrayBuffer and transfer to worker (zero-copy)
      const buffer = await file.arrayBuffer();
      const metadata = await readOneInWorker(worker, buffer, file, i);

      results.push({ url, metadata, fileName: name });

      if (onProgress) {
        onProgress(i + 1, total, file.name);
      }
    }
  } finally {
    worker.terminate();
  }

  return results;
}

// ---------------------------------------------------------------------------
// Internal — wrap a single worker postMessage roundtrip
// ---------------------------------------------------------------------------

function readOneInWorker(
  worker: Worker,
  buffer: ArrayBuffer,
  file: File,
  id: number,
): Promise<PhotoMetadata> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      if (event.data.id === id) {
        worker.removeEventListener("message", handler);
        resolve(event.data.metadata as PhotoMetadata);
      }
    };
    worker.addEventListener("message", handler);
    worker.addEventListener("error", reject, { once: true });

    // Transfer the buffer to the worker (zero-copy)
    worker.postMessage(
      {
        id,
        buffer,
        fileName: file.name,
        fileType: file.type,
        lastModified: file.lastModified,
      },
      [buffer],
    );
  });
}
