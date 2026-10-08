import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const slug = searchParams.get("slug")?.trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Store slug is required.",
        },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: {
        slug,
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
          },
        },
      },
    });

    if (!store || !store.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Store not found or inactive.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      store: {
        id: store.id,
        name: store.name,
        displayName: store.profile?.displayName ?? null,
        slug: store.slug,
        logoUrl:
          store.profile?.logoUrl ??
          store.logoUrl ??
          null,
        primaryColor:
          store.theme?.primaryColor ??
          store.primaryColor ??
          "#d71920",
        currency: store.currency,
      },
    });
  } catch (error) {
    console.error("Store context error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load store information.",
      },
      { status: 500 },
    );
  }
}