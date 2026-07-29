import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteMediaFile } from "@/lib/storage";
import { DEMO_MEMORIES } from "@/lib/demo-data";

/**
 * GET /api/memories/:id
 *
 * In demo mode — returns from static data by index.
 */
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/memories/[id]">,
) {
  const { id } = await ctx.params;

  if (!prisma) {
    const idx = parseInt(id.replace("seed-", ""), 10);
    const memory = DEMO_MEMORIES[idx];
    if (!memory) {
      return Response.json({ error: "Memory not found" }, { status: 404 });
    }
    return Response.json({ id, ...memory });
  }

  const memory = await prisma.memory.findUnique({ where: { id } });
  if (!memory) {
    return Response.json({ error: "Memory not found" }, { status: 404 });
  }
  return Response.json(memory);
}

/**
 * PATCH /api/memories/:id
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/memories/[id]">,
) {
  if (!prisma) {
    return Response.json({ error: "Demo mode — read only" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await request.json();

    const existing = await prisma.memory.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Memory not found" }, { status: 404 });
    }

    if (body.date) {
      body.year = new Date(body.date).getFullYear().toString();
    }

    const update: Record<string, unknown> = {};
    const allowedFields = [
      "title", "place", "date", "year", "lat", "lng",
      "color", "kind", "image", "media", "favorite",
      "description", "note", "symbol", "city", "country", "tags",
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
 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/memories/[id]">,
) {
  if (!prisma) {
    return Response.json({ error: "Demo mode — read only" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;

    const memory = await prisma.memory.findUnique({ where: { id } });
    if (!memory) {
      return Response.json({ error: "Memory not found" }, { status: 404 });
    }

    const allMedia = [
      ...(memory.image ? [memory.image] : []),
      ...(memory.media || []),
    ];
    for (const url of allMedia) {
      try { deleteMediaFile(url); } catch { /* ok */ }
    }

    await prisma.memory.delete({ where: { id } });

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
