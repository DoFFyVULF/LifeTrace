import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/threads/:id
 */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/threads/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const existing = await prisma.memoryThread.findUnique({ where: { id } });
    if (!existing) {
      return new Response(null, { status: 204 });
    }
    await prisma.memoryThread.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Delete thread error:", error);
    return Response.json({ error: "Failed to delete thread" }, { status: 500 });
  }
}
