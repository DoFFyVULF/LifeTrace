import { NextRequest } from "next/server";
import { readMedia } from "@/lib/storage";

/**
 * GET /api/media/2026/07/<uuid>.<ext>
 *
 * Serves uploaded media files from disk.
 * Path-traversal protected via storage.readMedia.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/media/[...path]">,
) {
  try {
    const { path } = await ctx.params;
    const { buffer, contentType } = await readMedia(path);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Not Found", { status: 404 });
    }
    return new Response("Forbidden", { status: 403 });
  }
}
