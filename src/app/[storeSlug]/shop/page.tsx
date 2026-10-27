import type { Metadata } from "next";
import ShopClient from "./ShopClient";
import { prisma } from "@/lib/prisma";

type ShopPageProps = {
  params: Promise<{
    storeSlug: string;
  }>;
  searchParams: Promise<{
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
  return prisma.store.findFirst({
    where: {
      slug: storeSlug,
      isActive: true,
    },
    select: {
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
    },
  });
}

export async function generateMetadata({
  params,
}: ShopPageProps): Promise<Metadata> {
  const { storeSlug: rawSlug } = await params;
  const storeSlug = rawSlug.trim().toLowerCase();

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
  params,
  searchParams,
}: ShopPageProps) {
  // Get the store slug from the URL path.
  const { storeSlug: rawSlug } = await params;
  const storeSlug = rawSlug.trim().toLowerCase();

  // Search and category remain query parameters.
  const paramsData = await searchParams;

  const search = getQueryValue(paramsData.search);
  const selectedCategory = getQueryValue(
    paramsData.category,
  );

  // Find only the active store matching this URL.
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

  // Load only the categories and products belonging to this store.
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

  // Convert Prisma Decimal values to strings for the client component.
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