
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Oscar Trading | Kitchenware & Home Essentials",
  description:
    "Discover cookware, kitchen utensils, dining accessories and everyday home essentials.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const storeSlug =
    process.env.STOREFRONT_STORE_SLUG?.trim().toLowerCase() ||
    "oscar-trading";

  const store = await prisma.store.findFirst({
    where: {
      slug: storeSlug,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      primaryColor: true,
      currency: true,
      heroOfferPercent: true,

      profile: {
        select: {
          businessName: true,
          displayName: true,
          tagline: true,
          description: true,
          logoUrl: true,
          phone: true,
          whatsapp: true,
          email: true,
          aboutText: true,
        },
      },

      settings: {
        select: {
          currency: true,
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

      heroSlides: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 3,
        select: {
          id: true,
          imageUrl: true,
          eyebrow: true,
          title: true,
          accentText: true,
          description: true,
          buttonText: true,
          buttonUrl: true,
          offerPercent: true,
        },
      },
    },
  });

  if (!store) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4ed] px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#65734d]">
            Kitchenware & Home Essentials
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-[#282a23]">
            Store unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#77776d]">
            This storefront is not available. Please check the store
            configuration and try again.
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
        description: true,
        imageUrl: true,
      },
      orderBy: { name: "asc" },
      take: 12,
    }),

    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        shortDescription: true,
        isFeatured: true,
        isAvailable: true,
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
          take: 3,
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
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    createdAt: product.createdAt.toISOString(),
  }));

  const categoriesWithFallback = categories.map((category) => {
    const categoryProduct = products.find(
      (product) => product.category?.id === category.id,
    );

    const fallbackImage =
      categoryProduct?.images?.find((image) => image.isPrimary) ??
      categoryProduct?.images?.[0];

    return {
      ...category,
      fallbackImageUrl: fallbackImage?.imageUrl ?? null,
    };
  });

  return (
    <HomeClient
      store={{
        name: store.name,
        displayName:
          store.profile?.displayName?.trim() ||
          store.profile?.businessName?.trim() ||
          store.name,
        tagline:
          store.profile?.tagline?.trim() ||
          "Thoughtfully chosen essentials for your kitchen.",
        description:
          store.profile?.description?.trim() ||
          store.description ||
          "Discover cookware, utensils, dining and everyday kitchen essentials.",
        aboutText: store.profile?.aboutText ?? null,
        logoUrl: store.profile?.logoUrl || store.logoUrl,
        phone: store.profile?.phone ?? null,
        whatsapp: store.profile?.whatsapp ?? null,
        email: store.profile?.email ?? null,
        currency: store.currency,
        primaryColor:
          store.theme?.primaryColor ||
          store.primaryColor ||
          "#34483A",
        secondaryColor:
          store.theme?.secondaryColor || "#292B25",
        accentColor: store.theme?.accentColor || "#B87856",
        backgroundColor: store.theme?.backgroundColor || "#F7F4ED",
        surfaceColor: store.theme?.surfaceColor || "#F0EDE4",
        textColor: store.theme?.textColor || "#292B25",
        mutedColor: store.theme?.mutedColor || "#77776D",
        heroOfferPercent: store.heroOfferPercent,
      }}
      categories={categoriesWithFallback}
      products={products}
      heroSlides={store.heroSlides}
    />
  );
}
