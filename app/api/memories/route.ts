import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteMediaFile } from "@/lib/storage";
import { DEMO_MEMORIES } from "@/lib/demo-data";

/**
 * GET /api/memories
 *
 * Returns all memories, ordered by date descending.
 * Supports ?filter=favorites and ?search=<query>.
 */
export async function GET(request: NextRequest) {
  if (!prisma) {
    return Response.json(DEMO_MEMORIES);
  }

  const { searchParams } = request.nextUrl;
  const filter = searchParams.get("filter");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (filter === "favorites") {
    where.favorite = true;
  }

  const memories = await prisma.memory.findMany({
    where,
    orderBy: { date: "desc" },
  });

  if (search) {
    const lowerSearch = search.toLowerCase();
    return Response.json(
      memories.filter(
        (m) =>
          m.title.toLowerCase().includes(lowerSearch) ||
          m.place.toLowerCase().includes(lowerSearch) ||
          (m.description ?? "").toLowerCase().includes(lowerSearch) ||
          (m.tags ?? []).some((tag) => tag.toLowerCase().includes(lowerSearch)),
      ),
    );
  }

  return Response.json(memories);
}

/**
 * POST /api/memories
 *
 * Create a new memory.
 * In demo mode (no DB) — return 403.
 */
export async function POST(request: NextRequest) {
  if (!prisma) {
    return Response.json({ error: "Demo mode — read only" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const {
      title,
      place = "",
      date = "",
      lat = 0,
      lng = 0,
      color = "#ef766b",
      kind = "memory",
      image,
      media = [],
      favorite = false,
      symbol = "pin",
      city = null,
      country = null,
      tags = [],
    } = body;

    if (!title?.trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }

    const year = date ? new Date(date).getFullYear().toString() : new Date().getFullYear().toString();

    const memory = await prisma.memory.create({
      data: {
        title,
        place,
        date,
        year,
        lat,
        lng,
        color,
        kind,
        image: image || null,
        media,
        favorite,
        symbol,
        city,
        country,
        tags,
      },
    });

    return Response.json(memory, { status: 201 });
  } catch (error) {
    console.error("Create memory error:", error);
    return Response.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
