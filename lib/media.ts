/**
 * Client-side helpers for media handling:
 * - isMediaSrc – check if a value is a media URL (vs colour hex)
 * - prepareUpload – convert a File into a Blob suitable for upload
 * - uploadMedia – POST a prepared blob to /api/upload, return the URL
 */

/**
 * Returns `true` when `value` looks like an image/video URL rather than a colour.
 */
export function isMediaSrc(value?: string | null): boolean {
  if (!value) return false;
  return (
    value.startsWith("data:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/api/media/")
  );
}

/**
 * Prepare a File for server upload.
 *
 * - **HEIC/HEIF** → decode client-side via heic2any → JPEG Blob
 * - **Images** → resize via canvas (max 1440 px) → JPEG Blob 0.78 quality
 * - **Videos / other** → original Blob (no server-side processing needed)
 *
 * Mirrors the old `readDataUrl` logic but yields a Blob and extension
 * instead of a base64 data URL.
 */
export async function prepareUpload(
  file: File,
): Promise<{ blob: Blob; name: string; kind: "image" | "video" }> {
  const isHeic =
    file.type.includes("heic") ||
    file.type.includes("heif") ||
    /\.(heic|heif)$/i.test(file.name);

  // HEIC → decode to JPEG Blob
  if (isHeic) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.82,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return { blob, name: `${file.name}.jpg`, kind: "image" };
  }

  // Video → upload raw (no client-side processing)
  if (file.type.startsWith("video/")) {
    return { blob: file, name: file.name, kind: "video" };
  }

  // Image → resize + recompress via canvas
  if (file.type.startsWith("image/") && !file.type.includes("svg")) {
    const blob = await resizeImage(file);
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return { blob, name, kind: "image" };
  }

  // Fallback for non-image non-video (SVG, etc.) – send original
  return { blob: file, name: file.name, kind: "image" };
}

/**
 * Resize an image file to max 1440px and return a JPEG Blob.
 */
async function resizeImage(file: File): Promise<Blob> {
  const source = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = source;
    });

    const maxSize = 1440;
    const scale = Math.min(
      1,
      maxSize / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        0.78,
      );
    });
  } finally {
    URL.revokeObjectURL(source);
  }
}

/**
 * Upload a prepared Blob to the server and return its served URL.
 */
export async function uploadMedia(
  blob: Blob,
  fileName: string,
  options?: { signal?: AbortSignal },
): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, fileName);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
    signal: options?.signal,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || "Upload failed");
  }

  const data = await res.json();
  // data.urls is a string when single, string[] when multiple
  return typeof data.urls === "string" ? data.urls : data.urls[0];
}
