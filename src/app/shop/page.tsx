
import Link from "next/link";
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
  const selectedCategory = params.category?.trim() ?? "";

  const store = await prisma.store.findUnique({
    where: { slug: "oscar-trading" },
    select: {
      id: true,
      name: true,
      currency: true,
    },
  });

  if (!store) {
    return (
      <main className="p-10 text-center">
        <h1 className="text-2xl font-bold">Store not found</h1>
      </main>
    );
  }

  const categories = await prisma.category.findMany({
    where: {
      storeId: store.id,
      isActive: true,
    },
    select: {
      name: true,
      slug: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      status: "PUBLISHED",
      isAvailable: true,

      ...(search
        ? {
            name: {
              contains: search,
            },
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

    include: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      images: {
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
  });

  const formatPrice = (price: unknown) =>
    new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: store.currency,
      maximumFractionDigits: 2,
    }).format(Number(price));

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Page heading */}
      <section className="bg-gray-100">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <p className="text-sm font-semibold text-red-600">
            OSCAR TRADING
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Shop All Products
          </h1>

          <p className="mt-3 text-gray-600">
            Explore our kitchenware and home essentials.
          </p>

          <div className="mt-4 text-sm text-gray-500">
            <Link href="/" className="hover:text-red-600">
              Home
            </Link>
            {" / "}
            <span className="text-gray-900">Shop</span>
          </div>
        </div>
      </section>

      {/* Search and category filters */}
      <section className="mx-auto max-w-7xl px-5 py-8">
        <form
          action="/shop"
          method="GET"
          className="grid gap-3 sm:grid-cols-[1fr_260px_auto]"
        >
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Search products..."
            className="min-w-0 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-red-600"
          />

          <select
            name="category"
            defaultValue={selectedCategory}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-red-600"
          >
            <option value="">All Categories</option>

            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-black"
          >
            Search
          </button>
        </form>

        {/* Results heading */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-xl font-bold">
              {selectedCategory
                ? categories.find(
                    (category) => category.slug === selectedCategory,
                  )?.name ?? "Products"
                : "All Products"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {products.length} product
              {products.length === 1 ? "" : "s"} found
            </p>
          </div>

          {(search || selectedCategory) && (
            <Link
              href="/shop"
              className="text-sm font-semibold text-red-600 hover:text-black"
            >
              Clear filters ×
            </Link>
          )}
        </div>

        {/* Product grid */}
        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => {
              const image = product.images[0];

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <Link
                    href={`/product/${product.slug}`}
                    className="block"
                  >
                    <div className="relative aspect-square overflow-hidden bg-gray-50">
                      {image ? (
                        <img
                          src={image.imageUrl}
                          alt={image.altText || product.name}
                          loading="lazy"
                          className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">
                          No image available
                        </div>
                      )}

                      {product.isFeatured && (
                        <span className="absolute left-3 top-3 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                          Featured
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-xs text-gray-500">
                        {product.category?.name ?? "Uncategorized"}
                      </p>

                      <h3 className="mt-2 min-h-10 text-sm font-semibold leading-5">
                        {product.name}
                      </h3>

                      <p className="mt-3 font-bold text-red-600">
                        {formatPrice(product.price)}
                      </p>

                      {product.compareAtPrice &&
                        Number(product.compareAtPrice) >
                          Number(product.price) && (
                          <p className="mt-1 text-xs text-gray-400 line-through">
                            {formatPrice(product.compareAtPrice)}
                          </p>
                        )}
                    </div>
                  </Link>

                  <div className="px-4 pb-4">
                    <Link
                      href={`/product/${product.slug}`}
                      className="block rounded-lg bg-gray-900 px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      View Product
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-gray-300 px-5 py-16 text-center">
            <div className="text-4xl">🔎</div>

            <h3 className="mt-4 text-xl font-bold">
              No products found
            </h3>

            <p className="mt-2 text-gray-500">
              Try another search term or choose a different category.
            </p>

            <Link
              href="/shop"
              className="mt-6 inline-block rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-black"
            >
              View all products
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}