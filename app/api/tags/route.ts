import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type TagEntry = { name: string; count: number };

/**
 * GET /api/tags
 *
 * Returns all unique tags across all memories (with usage count)
 * plus any known tags from the profile that have 0 memories.
 *
 * Response: { tags: { name: string; count: number }[] }
 */
export async function GET() {
  try {
    const [memories, profile] = await Promise.all([
      prisma.memory.findMany({ select: { tags: true } }),
      prisma.profile.findUnique({ where: { id: "singleton" } }),
    ]);

    // Aggregate tag frequencies from memories
    const frequency = new Map<string, number>();
    for (const memory of memories) {
      for (const tag of memory.tags) {
        frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
      }
    }

    // Include known tags that aren't on any memory yet
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
 *
 * Add a tag to the profile's known-tags list.
 * Body: { name: string }
 */
export async function POST(request: NextRequest) {
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
      update: {
        knownTags: {
          // Add tag only if not already present (PostgreSQL array append)
          push: tag,
        },
      },
    });

    // Deduplicate — PostgreSQL array push doesn't dedupe
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
 *
 * Removes a tag from all memories and from the profile's known-tags list.
 */
export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get("name");
    if (!name) {
      return Response.json({ error: "Tag name is required" }, { status: 400 });
    }

    const tag = name.trim().toLowerCase();

    // Remove from all memories — use raw SQL for array element removal
    // (Prisma doesn't have a native "remove from string array" yet)
    const memories = await prisma.memory.findMany({
      where: { tags: { has: tag } },
      select: { id: true, tags: true },
    });

    await Promise.all(
      memories.map((m) =>
        prisma.memory.update({
          where: { id: m.id },
          data: { tags: m.tags.filter((t) => t !== tag) },
        }),
      ),
    );

    // Remove from known tags
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
