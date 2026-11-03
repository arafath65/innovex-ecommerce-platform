import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveStorefrontForCurrentRequest } from "@/lib/storefront-domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeSlug = (searchParams.get("store") ?? "").trim().toLowerCase();
    const rawCategoryId = searchParams.get("categoryId");
    const categoryId = rawCategoryId ? Number(rawCategoryId) : null;
    const requestedLimit = Number(searchParams.get("limit") ?? 8);
    const take = Number.isInteger(requestedLimit)
      ? Math.min(9, Math.max(1, requestedLimit))
      : 8;

    if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId < 1)) {
      return NextResponse.json({ success: true, products: [] });
    }

    const resolution = await resolveStorefrontForCurrentRequest();
    let store = null;

    if (resolution.kind === "store") {
      store = await prisma.store.findFirst({
        where: { id: resolution.storeId, isActive: true },
        select: { id: true },
      });
    } else if (process.env.NODE_ENV !== "production" && storeSlug) {
      store = await prisma.store.findFirst({
        where: { slug: storeSlug, isActive: true },
        select: { id: true },
      });
    }

    if (!store) {
      return NextResponse.json({ success: true, products: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "PUBLISHED",
        ...(categoryId !== null ? { categoryId } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        isAvailable: true,
        images: {
          select: { imageUrl: true, altText: true },
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          take: 1,
        },
      },
      orderBy: [{ createdAt: "desc" }, { isFeatured: "desc" }],
      take,
    });

    return NextResponse.json(
      {
        success: true,
        products: products.map((product) => ({
          ...product,
          price: product.price.toString(),
          compareAtPrice: product.compareAtPrice?.toString() ?? null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Storefront menu products error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load menu products." },
      { status: 500 },
    );
  }
}
