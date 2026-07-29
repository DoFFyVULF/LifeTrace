import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_MEMORIES, DEMO_PROFILE } from "@/lib/demo-data";

export type TagEntry = { name: string; count: number };

/**
 * GET /api/tags
 *
 * In demo mode — computes from DEMO_MEMORIES.
 */
export async function GET() {
  if (!prisma) {
    return Response.json({ tags: computeDemoTags() });
  }

  try {
    const [memories, profile] = await Promise.all([
      prisma.memory.findMany({ select: { tags: true } }),
      prisma.profile.findUnique({ where: { id: "singleton" } }),
    ]);

    const frequency = new Map<string, number>();
    for (const memory of memories) {
      for (const tag of memory.tags) {
        frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
      }
    }

    for (const tag of profile?.knownTags ?? []) {
      if (!frequency.has(tag)) {
        frequency.set(tag, 0);
      }
    }

    const tags: TagEntry[] = Array.from(frequency.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return Response.json({ tags });
  } catch (error) {
    console.error("Tags fetch error:", error);
    return Response.json({ tags: [] });
  }
}

/**
 * POST /api/tags
 */
export async function POST(request: NextRequest) {
  if (!prisma) {
    return Response.json({ error: "Demo mode — read only" }, { status: 403 });
  }

  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string") {
      return Response.json({ error: "Tag name is required" }, { status: 400 });
    }

    const tag = name.trim().toLowerCase();
    if (!tag) {
      return Response.json({ error: "Tag name is required" }, { status: 400 });
    }

    const profile = await prisma.profile.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", knownTags: [tag] },
      update: { knownTags: { push: tag } },
    });

    const deduped = [...new Set(profile.knownTags)];
    if (deduped.length !== profile.knownTags.length) {
      await prisma.profile.update({
        where: { id: "singleton" },
        data: { knownTags: deduped },
      });
    }

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Tag create error:", error);
    return Response.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

/**
 * DELETE /api/tags?name=xxx
 */
export async function DELETE(request: NextRequest) {
  if (!prisma) {
    return Response.json({ error: "Demo mode — read only" }, { status: 403 });
  }

  try {
    const name = request.nextUrl.searchParams.get("name");
    if (!name) {
      return Response.json({ error: "Tag name is required" }, { status: 400 });
    }

    const tag = name.trim().toLowerCase();

    const memories = await prisma.memory.findMany({
      where: { tags: { has: tag } },
      select: { id: true, tags: true },
    });

    await Promise.all(
      memories.map((m) =>
        prisma!.memory.update({
          where: { id: m.id },
          data: { tags: m.tags.filter((t) => t !== tag) },
        }),
      ),
    );

    const profile = await prisma.profile.findUnique({
      where: { id: "singleton" },
      select: { knownTags: true },
    });

    if (profile && profile.knownTags.includes(tag)) {
      await prisma.profile.update({
        where: { id: "singleton" },
        data: { knownTags: profile.knownTags.filter((t) => t !== tag) },
      });
    }

    return Response.json({ success: true, removedFrom: memories.length });
  } catch (error) {
    console.error("Tag delete error:", error);
    return Response.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

// ─── Demo helpers ─────────────────────────────────────────────────

function computeDemoTags(): TagEntry[] {
  const frequency = new Map<string, number>();
  for (const memory of DEMO_MEMORIES) {
    for (const tag of memory.tags) {
      frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
    }
  }
  for (const tag of DEMO_PROFILE.knownTags ?? []) {
    if (!frequency.has(tag)) frequency.set(tag, 0);
  }
  return Array.from(frequency.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
