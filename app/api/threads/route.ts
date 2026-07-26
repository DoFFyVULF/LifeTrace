import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/threads
 */
export async function GET() {
  const threads = await prisma.memoryThread.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(threads);
}

/**
 * POST /api/threads
 * Body: { memoryIds: string[] } (at least 2)
 */
export async function POST(request: NextRequest) {
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
