import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const store = await prisma.store.findUnique({
      where: {
        id: session.storeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        currency: true,
        isActive: true,

        profile: {
          select: {
            displayName: true,
            logoUrl: true,
          },
        },

        theme: {
          select: {
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
            backgroundColor: true,
            surfaceColor: true,
            textColor: true,
            mutedColor: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 },
      );
    }

    if (!store.isActive) {
      return NextResponse.json(
        { error: "Store is inactive" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("GET current store error:", error);

    return NextResponse.json(
      { error: "Failed to load current store" },
      { status: 500 },
    );
  }
}