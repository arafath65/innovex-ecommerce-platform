import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = (searchParams.get("q") ?? "").trim().slice(0, 80);
    const storeSlug = (searchParams.get("store") ?? "")
      .trim()
      .toLowerCase();

    if (query.length < 2 || !storeSlug) {
      return NextResponse.json({
        success: true,
        products: [],
      });
    }

    const store = await prisma.store.findFirst({
      where: {
        slug: storeSlug,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!store) {
      return NextResponse.json({
        success: true,
        products: [],
      });
    }

    const products = await prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "PUBLISHED",
        OR: [
          {
            name: {
              contains: query,
            },
          },
          {
            slug: {
              contains: query,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        isAvailable: true,
        images: {
          select: {
            imageUrl: true,
            altText: true,
          },
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
          ],
          take: 1,
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
      take: 5,
    });

    return NextResponse.json(
      {
        success: true,
        products: products.map((product) => ({
          ...product,
          price: product.price.toString(),
          compareAtPrice:
            product.compareAtPrice?.toString() ?? null,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Storefront search error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to search products right now.",
      },
      { status: 500 },
    );
  }
}