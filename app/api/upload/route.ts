import { NextRequest } from "next/server";
import { saveUpload } from "@/lib/storage";

/**
 * POST /api/upload
 *
 * Accepts one or more files via multipart/form-data.
 * Returns an array of served URLs like `/api/media/2026/07/<uuid>.<ext>`.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const entries = Array.from(formData.entries());

    // Collect all file entries — the field name doesn't matter.
    const fileEntries = entries.filter(
      (entry): entry is [string, File] => entry[1] instanceof File && entry[1].size > 0,
    );

    if (!fileEntries.length) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    const urls: string[] = [];

    for (const [, file] of fileEntries) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const url = saveUpload(buffer, file.name);
      urls.push(url);
    }

    return Response.json(
      { urls: urls.length === 1 ? urls[0] : urls },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
