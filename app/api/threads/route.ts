import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_MEMORIES, DEMO_THREADS } from "@/lib/demo-data";

/**
 * GET /api/threads
 *
 * In demo mode — returns threads built from static data indices.
 */
export async function GET() {
  if (!prisma) {
    const threads = DEMO_THREADS.map((t, i) => ({
      id: `seed-thread-${i}`,
      memoryIds: t.memoryIds.map((idx) => `seed-${idx}`),
      createdAt: new Date("2026-01-01").toISOString(),
      updatedAt: new Date("2026-01-01").toISOString(),
    }));
    return Response.json(threads);
  }

  const threads = await prisma.memoryThread.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(threads);
}

/**
 * POST /api/threads
 */
export async function POST(request: NextRequest) {
  if (!prisma) {
    return Response.json({ error: "Demo mode — read only" }, { status: 403 });
  }

  try {
    const { memoryIds } = await request.json();

    if (!Array.isArray(memoryIds) || memoryIds.length < 2) {
      return Response.json(
        { error: "At least 2 memory IDs required" },
        { status: 400 },
      );
    }

    const thread = await prisma.memoryThread.create({
      data: { memoryIds },
    });

    return Response.json(thread, { status: 201 });
  } catch (error) {
    console.error("Create thread error:", error);
    return Response.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
