import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Oscar Trading | Kitchenware & Home Essentials",
  description:
    "Shop quality kitchenware and home essentials from Oscar Trading.",
};

export default async function HomePage() {
  const store = await prisma.store.findUnique({
    where: {
      slug: "oscar-trading",
    },
    select: {
      id: true,
      name: true,
      currency: true,
      heroOfferPercent: true,
    },
  });

  if (!store) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ef] px-5">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d71920]">
            Oscar Trading
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#111111]">
            Store unavailable
          </h1>
          <p className="mt-2 text-sm text-black/45">
            Please try again shortly.
          </p>
        </div>
      </main>
    );
  }

  const [categories, rawProducts] = await Promise.all([
    prisma.category.findMany({
      where: {
        storeId: store.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "PUBLISHED",
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        shortDescription: true,
        isFeatured: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            altText: true,
            isPrimary: true,
            sortOrder: true,
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
      take: 16,
    }),
  ]);

  const products = rawProducts.map((product) => ({
    ...product,
    price: product.price.toString(),
    compareAtPrice:
      product.compareAtPrice?.toString() ?? null,
    createdAt: product.createdAt.toISOString(),
  }));

  return (
    <HomeClient
      store={{
        name: store.name,
        currency: store.currency,
      }}
      categories={categories}
      products={products}
      heroOfferPercent={store.heroOfferPercent}
    />
  );
}
