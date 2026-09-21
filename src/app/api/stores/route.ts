
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
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