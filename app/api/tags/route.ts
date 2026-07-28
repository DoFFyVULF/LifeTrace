import { prisma } from "@/lib/prisma";

/**
 * GET /api/tags
 *
 * Returns all unique tags across all memories with their usage count,
 * sorted by count descending.
 *
 * Response shape:
 *   { tags: { name: string; count: number }[] }
 */
export async function GET() {
  try {
    const memories = await prisma.memory.findMany({
      select: { tags: true },
    });

    // Aggregate tag frequencies
    const frequency = new Map<string, number>();
    for (const memory of memories) {
      for (const tag of memory.tags) {
        frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
      }
    }

    const tags = Array.from(frequency.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return Response.json({ tags });
  } catch (error) {
    console.error("Tags fetch error:", error);
    return Response.json({ tags: [] });
  }
}
