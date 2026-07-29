import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/collections/:id
 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/collections/[id]">,
) {
  if (!prisma) {
    return Response.json({ error: "Demo mode — read only" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return new Response(null, { status: 204 });
    }
    await prisma.collection.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete collection error:", error);
    return Response.json(
      { error: "Failed to delete collection" },
      { status: 500 },
    );
  }
}
