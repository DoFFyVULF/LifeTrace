import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteMediaFile } from "@/lib/storage";

/**
 * GET /api/memories/:id
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/memories/[id]">,
) {
  const { id } = await ctx.params;
  const memory = await prisma.memory.findUnique({ where: { id } });

  if (!memory) {
    return Response.json({ error: "Memory not found" }, { status: 404 });
  }

  return Response.json(memory);
}

/**
 * PATCH /api/memories/:id
 *
 * Partial update. Fields not sent stay unchanged.
 * Body can include any Memory fields: title, place, date, lat, lng, color,
 * kind, image, media, favorite, description, note.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/memories/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    const existing = await prisma.memory.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Memory not found" }, { status: 404 });
    }

    // If date changed, recalculate year
    if (body.date) {
      body.year = new Date(body.date).getFullYear().toString();
    }

    // Build update payload — only include known fields
    const update: Record<string, unknown> = {};
    const allowedFields = [
      "title", "place", "date", "year", "lat", "lng",
      "color", "kind", "image", "media", "favorite",
      "description", "note", "symbol",
    ];
    for (const field of allowedFields) {
      if (field in body) {
        update[field] = body[field];
      }
    }

    const memory = await prisma.memory.update({
      where: { id },
      data: update,
    });

    return Response.json(memory);
  } catch (error) {
    console.error("Update memory error:", error);
    return Response.json({ error: "Failed to update memory" }, { status: 500 });
  }
}

/**
 * DELETE /api/memories/:id
 *
 * Deletes the memory and its associated media files from disk.
 * Also cleans up threads that referenced this memory.
 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/memories/[id]">,
) {
  try {
    const { id } = await ctx.params;

    const memory = await prisma.memory.findUnique({ where: { id } });
    if (!memory) {
      return Response.json({ error: "Memory not found" }, { status: 404 });
    }

    // Delete media files from disk
    const allMedia = [
      ...(memory.image ? [memory.image] : []),
      ...(memory.media || []),
    ];
    for (const url of allMedia) {
      try {
        deleteMediaFile(url);
      } catch {
        // File may not exist — that's fine
      }
    }

    // Delete the memory record
    await prisma.memory.delete({ where: { id } });

    // Clean up threads that reference this id
    const threads = await prisma.memoryThread.findMany({
      where: { memoryIds: { has: id } },
    });
    for (const thread of threads) {
      const filtered = thread.memoryIds.filter((mid) => mid !== id);
      if (filtered.length < 2) {
        await prisma.memoryThread.delete({ where: { id: thread.id } });
      } else {
        await prisma.memoryThread.update({
          where: { id: thread.id },
          data: { memoryIds: filtered },
        });
      }
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete memory error:", error);
    return Response.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
