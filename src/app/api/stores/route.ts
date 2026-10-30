
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { success: false, message: auth.error },
      { status: auth.status },
    );
  }

  try {
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        template: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: stores.length,
      stores,
    });
  } catch (error) {
    console.error("Store retrieval failed:", error);

    return NextResponse.json(
      { success: false, message: "Could not retrieve stores." },
      { status: 500 },
    );
  }
}