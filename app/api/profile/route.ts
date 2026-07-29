import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_PROFILE } from "@/lib/demo-data";

const SINGLETON_ID = "singleton";

/**
 * GET /api/profile
 *
 * In demo mode — returns static profile data.
 */
export async function GET() {
  if (!prisma) {
    return Response.json({ ...DEMO_PROFILE });
  }

  let profile = await prisma.profile.findUnique({
    where: { id: SINGLETON_ID },
  });
  if (!profile) {
    profile = await prisma.profile.create({
      data: { id: SINGLETON_ID },
    });
  }
  return Response.json(profile);
}

/**
 * PATCH /api/profile
 */
export async function PATCH(request: NextRequest) {
  if (!prisma) {
    return Response.json({ error: "Demo mode — read only" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const update: Record<string, unknown> = {};

    if ("name" in body) update.name = body.name;
    if ("avatarPath" in body) update.avatarPath = body.avatarPath;
    if ("locale" in body) update.locale = body.locale;
    if ("selectedTitle" in body) update.selectedTitle = body.selectedTitle;

    const profile = await prisma.profile.upsert({
      where: { id: SINGLETON_ID },
      update,
      create: { id: SINGLETON_ID, ...update },
    });

    return Response.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    return Response.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
