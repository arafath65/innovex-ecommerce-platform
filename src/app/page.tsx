import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";

type SearchParams = {
  store?: string | string[];
};

function getSingleParam(
  value: string | string[] | undefined,
) {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const requestedSlug = getSingleParam(
    params.store,
  )
    .trim()
    .toLowerCase();

  const store = requestedSlug
    ? await prisma.store.findFirst({
        where: {
          slug: requestedSlug,
          isActive: true,
        },
        select: {
          name: true,
          description: true,
          profile: {
            select: {
              displayName: true,
              tagline: true,
            },
          },
        },
      })
    : await prisma.store.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
        select: {
          name: true,
          description: true,
          profile: {
            select: {
              displayName: true,
              tagline: true,
            },
          },
        },
      });

  const storeName =
    store?.profile?.displayName?.trim() ||
    store?.name ||
    "Online Store";

  const description =
    store?.profile?.tagline?.trim() ||
    store?.description?.trim() ||
    `Shop from ${storeName}.`;

  return {
    title: storeName,
    description,
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const requestedSlug = getSingleParam(
    params.store,
  )
    .trim()
    .toLowerCase();

  const store = requestedSlug
    ? await prisma.store.findFirst({
        where: {
          slug: requestedSlug,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          currency: true,
          primaryColor: true,
          heroOfferPercent: true,
          logoUrl: true,

          profile: {
            select: {
              displayName: true,
              tagline: true,
              logoUrl: true,
            },
          },

          theme: {
            select: {
              primaryColor: true,
            },
          },
        },
      })
    : await prisma.store.findFirst({
        where: {
          isActive: true,
        },
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          currency: true,
          primaryColor: true,
          heroOfferPercent: true,
          logoUrl: true,

          profile: {
            select: {
              displayName: true,
              tagline: true,
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

  if (!store) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ef] px-5">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-black/35">
            Storefront
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#111111]">
            Store unavailable
          </h1>

          <p className="mt-2 text-sm text-black/45">
            The requested store could not be found.
          </p>
        </div>
      </main>
    );
  }

  const [categories, rawProducts] =
    await Promise.all([
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
              {
                isPrimary: "desc",
              },
              {
                sortOrder: "asc",
              },
            ],
            take: 1,
          },
        },

        orderBy: [
          {
            isFeatured: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        take: 16,
      }),
    ]);

  const products = rawProducts.map(
    (product) => ({
      ...product,
      price: product.price.toString(),

      compareAtPrice:
        product.compareAtPrice?.toString() ??
        null,

      createdAt:
        product.createdAt.toISOString(),
    }),
  );

  const primaryColor =
    store.theme?.primaryColor ||
    store.primaryColor ||
    "#d71920";

  const logoUrl =
    store.profile?.logoUrl ||
    store.logoUrl ||
    null;

  const displayName =
    store.profile?.displayName ||
    store.name;

  return (
    <HomeClient
      store={{
        name: store.name,
        displayName,
        tagline:
          store.profile?.tagline ?? null,
        logoUrl,
        slug: store.slug,
        currency: store.currency,
        primaryColor,
      }}
      categories={categories}
      products={products}
      heroOfferPercent={
        store.heroOfferPercent
      }
    />
  );
}
