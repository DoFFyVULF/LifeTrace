import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/collections
 */
export async function GET() {
  const collections = await prisma.collection.findMany({
    orderBy: { createdAt: "desc" },
  });
  return Response.json(collections);
}

/**
 * POST /api/collections
 * Body: { name: string, memoryIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { name, memoryIds } = await request.json();

    if (!name?.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    if (!Array.isArray(memoryIds) || !memoryIds.length) {
      return Response.json(
        { error: "At least one memory ID required" },
        { status: 400 },
      );
    }

    const collection = await prisma.collection.create({
      data: { name: name.trim(), memoryIds },
    });

    return Response.json(collection, { status: 201 });
  } catch (error) {
    console.error("Create collection error:", error);
    return Response.json({ error: "Failed to create collection" }, { status: 500 });
  }
}
