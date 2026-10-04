import ShopClient from "./ShopClient";
import { prisma } from "@/lib/prisma";

type ShopPageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
  }>;
};

export default async function ShopPage({
  searchParams,
}: ShopPageProps) {
  const params = await searchParams;

  const search = params.search?.trim() ?? "";
  const selectedCategory =
    params.category?.trim() ?? "";

  const store = await prisma.store.findUnique({
    where: {
      slug: "oscar-trading",
    },
    select: {
      id: true,
      name: true,
      currency: true,
    },
  });

  if (!store) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f3ef] px-5">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d71920]">
            Oscar Trading
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#111111]">
            Store unavailable
          </h1>

          <p className="mt-2 text-sm text-black/45">
            We could not load the store at this time.
          </p>
        </div>
      </main>
    );
  }

  const categories = await prisma.category.findMany({
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
  });

  const rawProducts = await prisma.product.findMany({
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
  });

  const products = rawProducts.map(
    (product) => ({
      ...product,

      price: product.price.toString(),

      compareAtPrice:
        product.compareAtPrice?.toString() ??
        null,
    }),
  );

  return (
    <ShopClient
      store={{
        name: store.name,
        currency: store.currency,
      }}
      categories={categories}
      products={products}
      search={search}
      selectedCategory={selectedCategory}
    />
  );
}