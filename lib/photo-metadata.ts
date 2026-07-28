/**
 * EXIF / metadata reading for photo files.
 *
 * Extracted into its own module so it can be shared between the main thread
 * and a Web Worker. The worker uses `readMetadataFromBuffer` directly;
 * the main thread can use either helper.
 */

export type PhotoMetadata = {
  date: string;
  lat?: number;
  lng?: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateValue(
  value: string | undefined,
  fallback: number,
): string {
  if (!value) return new Date(fallback).toISOString().slice(0, 10);
  const match = value.match(/(\d{4})[:/-](\d{2})[:/-](\d{2})/);
  return match
    ? `${match[1]}-${match[2]}-${match[3]}`
    : new Date(fallback).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// EXIF parsing (from ArrayBuffer) — exported so a Web Worker can use it
// ---------------------------------------------------------------------------

export async function readMetadataFromBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  fileType: string,
  lastModified: number,
): Promise<PhotoMetadata> {
  const fallback = lastModified || Date.now();

  // 1. Try exifr library first
  try {
    const { parse } = await import("exifr");
    const parsed = await parse(buffer);
    return extractFromParsed(parsed, fallback);
  } catch {
    /* fall through to the JPEG segment scanner */
  }

  // 2. exifr failed — only JPEG has a usable fallback
  if (
    !fileType.includes("jpeg") &&
    !fileType.includes("jpg") &&
    !/\.(jpg|jpeg)$/i.test(fileName)
  ) {
    return { date: toDateValue(undefined, fallback) };
  }

  // 3. Manual JPEG EXIF segment scanner
  try {
    return scanJpegExif(buffer, fallback);
  } catch {
    return { date: toDateValue(undefined, fallback) };
  }
}

// ---------------------------------------------------------------------------
// Convenience wrapper that accepts a File
// ---------------------------------------------------------------------------

export async function readMetadataFromFile(
  file: File,
): Promise<PhotoMetadata> {
  const buffer = await file.arrayBuffer();
  return readMetadataFromBuffer(buffer, file.name, file.type, file.lastModified);
}

// ---------------------------------------------------------------------------
// isSupportedPhoto helper
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the file looks like a photo we can try to read EXIF from.
 */
export function isPhotoFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(heic|heif|jpg|jpeg|png|webp|gif|avif|bmp|tif|tiff)$/i.test(file.name)
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractFromParsed(
  parsed: Record<string, unknown> | undefined,
  fallback: number,
): PhotoMetadata {
  const parsedDate =
    parsed?.DateTimeOriginal ?? parsed?.CreateDate ?? parsed?.ModifyDate;
  const lat =
    typeof parsed?.latitude === "number" ? parsed.latitude : undefined;
  const lng =
    typeof parsed?.longitude === "number" ? parsed.longitude : undefined;

  if (parsedDate || lat !== undefined || lng !== undefined) {
    return {
      date: toDateValue(
        parsedDate instanceof Date
          ? parsedDate.toISOString()
          : String(parsedDate ?? ""),
        fallback,
      ),
      lat,
      lng,
    };
  }
  return { date: toDateValue(undefined, fallback) };
}

function scanJpegExif(
  buffer: ArrayBuffer,
  fallback: number,
): PhotoMetadata {
  const bytes = new DataView(buffer);
  let exif = -1;

  // Scan APP1 markers for the "Exif\0\0" signature
  for (let offset = 2; offset < bytes.byteLength - 10; ) {
    if (
      bytes.getUint8(offset) === 0xff &&
      bytes.getUint8(offset + 1) === 0xe1
    ) {
      const segmentEnd = offset + 2 + bytes.getUint16(offset + 2, false);
      if (bytes.getUint32(offset + 4, false) === 0x45786966) {
        exif = offset + 4;
        break;
      }
      offset = segmentEnd;
    } else {
      offset += 1;
    }
  }

  if (exif < 0 || bytes.getUint32(exif, false) !== 0x45786966) {
    return { date: toDateValue(undefined, fallback) };
  }

  const tiff = exif + 6;
  const little = bytes.getUint16(tiff, false) === 0x4949;
  const u16 = (at: number) => bytes.getUint16(at, little);
  const u32 = (at: number) => bytes.getUint32(at, little);
  const typeSize = (type: number) => (type === 3 ? 2 : type === 4 ? 4 : 1);

  const readAscii = (at: number, count: number) =>
    Array.from({ length: count }, (_, i) =>
      String.fromCharCode(bytes.getUint8(at + i)),
    )
      .join("")
      .replace(/\0/g, "")
      .trim();

  const valueAt = (entry: number, type: number, count: number) => {
    const size = typeSize(type) * count;
    const pointer = size <= 4 ? entry + 8 : tiff + u32(entry + 8);
    return type === 2
      ? readAscii(pointer, count)
      : type === 5
        ? [u32(pointer) / Math.max(1, u32(pointer + 4))]
        : [];
  };

  const ifd = (offset: number) => {
    const result = new Map<number, { type: number; count: number; entry: number }>();
    const count = u16(offset);
    for (let i = 0; i < count; i++) {
      const entry = offset + 2 + i * 12;
      result.set(u16(entry), {
        type: u16(entry + 2),
        count: u32(entry + 4),
        entry,
      });
    }
    return result;
  };

  const main = ifd(tiff + u32(tiff + 4));
  const dateEntry = main.get(0x9003) || main.get(0x0132);
  const date = dateEntry
    ? String(valueAt(dateEntry.entry, dateEntry.type, dateEntry.count))
    : toDateValue(undefined, fallback);

  const gpsPointer = main.get(0x8825);
  if (!gpsPointer) return { date: toDateValue(date, fallback) };

  const gpsOffset = tiff + u32(gpsPointer.entry + 8);
  const gps = ifd(gpsOffset);

  const readRef = (tag: number) => {
    const entry = gps.get(tag);
    return entry ? readAscii(entry.entry + 8, 1) : "";
  };

  const readCoord = (tag: number) => {
    const entry = gps.get(tag);
    if (!entry) return [];
    const pointer = tiff + u32(entry.entry + 8);
    return [0, 1, 2].map((i) => {
      const at = pointer + i * 8;
      return u32(at) / Math.max(1, u32(at + 4));
    });
  };

  const lat = readCoord(2);
  const lng = readCoord(4);

  return {
    date: toDateValue(date, fallback),
    lat:
      lat.length === 3
        ? (lat[0] + lat[1] / 60 + lat[2] / 3600) *
          (readRef(1) === "S" ? -1 : 1)
        : undefined,
    lng:
      lng.length === 3
        ? (lng[0] + lng[1] / 60 + lng[2] / 3600) *
          (readRef(3) === "W" ? -1 : 1)
        : undefined,
  };
}
