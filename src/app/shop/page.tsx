import type { Metadata } from "next";
import ShopClient from "./ShopClient";
import { prisma } from "@/lib/prisma";

type ShopPageProps = {
  searchParams: Promise<{
    store?: string | string[];
    search?: string | string[];
    category?: string | string[];
  }>;
};

function getQueryValue(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

async function getStore(storeSlug: string) {
  const select = {
    id: true,
    name: true,
    slug: true,
    currency: true,
    description: true,
    heroOfferPercent: true,
    primaryColor: true,
    profile: {
      select: {
        displayName: true,
        tagline: true,
        logoUrl: true,
      },
    },
  } as const;

  if (storeSlug) {
    return prisma.store.findFirst({
      where: {
        slug: storeSlug,
        isActive: true,
      },
      select,
    });
  }

  return prisma.store.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      id: "asc",
    },
    select,
  });
}

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  const params = await searchParams;

  const storeSlug = getQueryValue(params.store);

  const store = await getStore(storeSlug);

  if (!store) {
    return {
      title: "Shop",
      description: "Browse products.",
    };
  }

  const displayName =
    store.profile?.displayName?.trim() || store.name;

  const description =
    store.profile?.tagline?.trim() ||
    store.description?.trim() ||
    `Browse products from ${displayName}.`;

  return {
    title: `Shop | ${displayName}`,
    description,
  };
}

export default async function ShopPage({
  searchParams,
}: ShopPageProps) {
  const params = await searchParams;

  const storeSlug = getQueryValue(params.store);
  const search = getQueryValue(params.search);
  const selectedCategory = getQueryValue(params.category);

  const store = await getStore(storeSlug);

  if (!store) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f7f5] px-5">
        <div className="max-w-md text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/35">
            Storefront
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111111]">
            Store unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-black/45">
            We could not find an active store for this shopping
            session.
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

        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                  },
                },
                {
                  sku: {
                    contains: search,
                  },
                },
                {
                  shortDescription: {
                    contains: search,
                  },
                },
                {
                  description: {
                    contains: search,
                  },
                },
              ],
            }
          : {}),

        ...(selectedCategory
          ? {
              category: {
                is: {
                  slug: selectedCategory,
                  isActive: true,
                },
              },
            }
          : {}),
      },

      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        compareAtPrice: true,
        shortDescription: true,
        description: true,
        isFeatured: true,

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
    }),
  ]);

  const products = rawProducts.map((product) => ({
    ...product,
    price: product.price.toString(),
    compareAtPrice:
      product.compareAtPrice?.toString() ?? null,
  }));

  const displayName =
    store.profile?.displayName?.trim() || store.name;

  return (
    <ShopClient
      store={{
        name: displayName,
        slug: store.slug,
        currency: store.currency,
        primaryColor: store.primaryColor || "#d71920",
        logoUrl: store.profile?.logoUrl ?? null,
        tagline: store.profile?.tagline ?? null,
      }}
      categories={categories}
      products={products}
      search={search}
      selectedCategory={selectedCategory}
    />
  );
}