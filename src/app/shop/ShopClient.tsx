"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  shortDescription: string | null;
  description: string | null;
  isFeatured: boolean;

  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;

  images?: {
    id: number;
    imageUrl: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }[];
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

type ShopClientProps = {
  store: {
    name: string;
    currency: string;
  };

  categories: Category[];

  products: Product[];

  search: string;

  selectedCategory: string;
};

function formatPrice(
  value: string | number | null,
  currency: string,
) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return `${currency} 0.00`;
  }

  return new Intl.NumberFormat(
    "en-LK",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

function resolveImageUrl(
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  let url = value
    .trim()
    .replace(/\\/g, "/");

  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  url = url
    .replace(/^\.\/+/i, "")
    .replace(/^public\//i, "")
    .replace(/^\/public\//i, "/");

  const publicIndex = url
    .toLowerCase()
    .indexOf("/public/");

  if (publicIndex >= 0) {
    url = url.slice(
      publicIndex + 8,
    );
  }

  return url.startsWith("/")
    ? url
    : `/${url}`;
}

function getProductImage(
  product: Product,
) {
  const image =
    product.images?.find(
      (item) => item.isPrimary,
    ) ??
    product.images?.[0];

  return {
    url: resolveImageUrl(
      image?.imageUrl,
    ),
    alt:
      image?.altText ||
      product.name,
  };
}

function getDiscountPercentage(
  product: Product,
) {
  const price = Number(product.price);

  const compareAt = Number(
    product.compareAtPrice,
  );

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(compareAt) ||
    compareAt <= price ||
    compareAt <= 0
  ) {
    return 0;
  }

  return Math.round(
    ((compareAt - price) /
      compareAt) *
      100,
  );
}

function categoryHref(
  slug: string,
  search: string,
) {
  const params =
    new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  params.set("category", slug);

  return `/shop?${params.toString()}`;
}

export default function ShopClient({
  store,
  categories,
  products,
  search,
  selectedCategory,
}: ShopClientProps) {
  const rootRef =
    useRef<HTMLDivElement>(null);

  const searchInputRef =
    useRef<HTMLInputElement>(null);

  const router = useRouter();

  const selectedCategoryName =
    categories.find(
      (category) =>
        category.slug ===
        selectedCategory,
    )?.name;

  useGSAP(
    () => {
      const prefersReducedMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

      if (prefersReducedMotion) {
        return;
      }

      const timeline =
        gsap.timeline({
          defaults: {
            ease: "power3.out",
          },
        });

      timeline
        .from(".shop-hero-copy", {
          opacity: 0,
          y: 28,
          duration: 0.7,
        })
        .from(
          ".shop-hero-panel",
          {
            opacity: 0,
            x: 30,
            scale: 0.96,
            duration: 0.8,
          },
          "-=0.55",
        )
        .from(
          ".shop-search",
          {
            opacity: 0,
            y: 18,
            duration: 0.5,
          },
          "-=0.45",
        )
        .from(
          ".shop-category-pill",
          {
            opacity: 0,
            y: 12,
            duration: 0.35,
            stagger: 0.05,
          },
          "-=0.3",
        )
        .from(
          ".shop-results-heading",
          {
            opacity: 0,
            y: 14,
            duration: 0.4,
          },
          "-=0.15",
        );

      if (products.length > 0) {
        timeline.from(
          ".shop-card",
          {
            opacity: 0,
            y: 24,
            scale: 0.98,
            duration: 0.5,
            stagger: 0.07,
          },
          "-=0.18",
        );
      } else {
        timeline.from(
          ".shop-empty",
          {
            opacity: 0,
            y: 18,
            duration: 0.5,
          },
          "-=0.1",
        );
      }
    },
    {
      scope: rootRef,
      dependencies: [
        products,
        search,
        selectedCategory,
      ],
      revertOnUpdate: true,
    },
  );

  function handleSearch(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value =
      searchInputRef.current?.value.trim() ??
      "";

    const params =
      new URLSearchParams();

    if (value) {
      params.set("search", value);
    }

    if (selectedCategory) {
      params.set(
        "category",
        selectedCategory,
      );
    }

    const query =
      params.toString();

    router.push(
      query
        ? `/shop?${query}`
        : "/shop",
    );
  }

  return (
    <main
      ref={rootRef}
      className="min-h-screen overflow-hidden bg-[#f5f3ef] text-[#111111]"
    >
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#101010] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#d71920]/20 blur-3xl" />

          <div className="absolute right-0 top-0 h-[420px] w-[420px] rounded-full bg-[#d71920]/15 blur-[100px]" />

          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize:
                "52px 52px",
            }}
          />
        </div>

        <div className="relative mx-auto grid max-w-[1500px] gap-10 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:px-12 lg:py-16">
          <div className="shop-hero-copy max-w-3xl">
            <div className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              <span>Oscar Trading</span>

              <span className="h-px w-8 bg-[#d71920]" />

              <span className="text-[#d71920]">
                Shop
              </span>
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Everyday
              <span className="block text-[#d71920]">
                essentials.
              </span>
              Beautifully chosen.
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base">
              Discover kitchenware and home
              essentials selected for everyday
              living. Practical pieces with a
              premium Oscar Trading feel.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="#products"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-bold text-[#111111] transition hover:bg-[#d71920] hover:text-white"
              >
                Explore collection

                <ArrowUpRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/55 backdrop-blur">
                <Sparkles
                  size={13}
                  className="text-[#d71920]"
                />

                Curated for your home
              </div>
            </div>
          </div>

          <div className="shop-hero-panel relative">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur">
              <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#d71920]/25 blur-2xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                      Collection
                    </p>

                    <p className="mt-1 text-lg font-bold">
                      Oscar Essentials
                    </p>
                  </div>

                  <div className="grid size-11 place-items-center rounded-2xl bg-[#d71920]">
                    <span className="text-sm font-black">
                      O
                    </span>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-2xl font-black">
                      {categories.length}
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/35">
                      Categories
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-2xl font-black">
                      {products.length}
                    </p>

                    <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/35">
                      Products
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-[#d71920]/20 bg-[#d71920]/10 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#ff7c80]">
                    Featured
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white/80">
                    Premium pieces for everyday
                    cooking and living.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative mx-auto max-w-[1500px] px-5 pb-7 sm:px-8 lg:px-12">
          <form
            onSubmit={handleSearch}
            className="shop-search flex flex-col gap-2 rounded-[22px] border border-white/10 bg-white/[0.055] p-2 shadow-2xl backdrop-blur-xl sm:flex-row"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4">
              <Search
                size={18}
                className="shrink-0 text-white/35"
              />

              <input
                ref={searchInputRef}
                type="search"
                defaultValue={search}
                placeholder="Search products, kitchenware, essentials..."
                className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#d71920] px-6 text-xs font-bold text-white transition hover:bg-[#ef2028]"
            >
              Search
              <ChevronRight size={14} />
            </button>
          </form>
        </div>
      </section>

      {/* CATEGORY STRIP */}
      <section className="border-b border-black/6 bg-[#f5f3ef]">
        <div className="mx-auto max-w-[1500px] px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href={
                search
                  ? `/shop?search=${encodeURIComponent(search)}`
                  : "/shop"
              }
              className={`shop-category-pill shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-bold transition ${
                !selectedCategory
                  ? "border-[#111111] bg-[#111111] text-white"
                  : "border-black/10 bg-white text-black/55 hover:border-black/25 hover:text-black"
              }`}
            >
              All products
            </Link>

            {categories.map(
              (category) => (
                <Link
                  key={category.id}
                  href={categoryHref(
                    category.slug,
                    search,
                  )}
                  className={`shop-category-pill shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-bold transition ${
                    selectedCategory ===
                    category.slug
                      ? "border-[#d71920] bg-[#d71920] text-white"
                      : "border-black/10 bg-white text-black/55 hover:border-[#d71920]/35 hover:text-[#d71920]"
                  }`}
                >
                  {category.name}
                </Link>
              ),
            )}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section
        id="products"
        className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16"
      >
        <div className="shop-results-heading mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d71920]">
              {selectedCategory
                ? "Category"
                : search
                  ? "Search results"
                  : "The collection"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                {selectedCategoryName ??
                  (search
                    ? `Results for “${search}”`
                    : "Shop all")}
              </h2>

              <span className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-[10px] font-bold text-black/45">
                {products.length}
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">
              {selectedCategoryName
                ? `Explore our ${selectedCategoryName.toLowerCase()} collection.`
                : "Thoughtfully selected products for kitchens, homes and everyday moments."}
            </p>
          </div>

          {(search ||
            selectedCategory) && (
            <Link
              href="/shop"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-black/60 transition hover:border-[#d71920]/30 hover:text-[#d71920]"
            >
              Clear filters
              <span className="text-black/25">
                ×
              </span>
            </Link>
          )}
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {products.map(
              (product) => {
                const image =
                  getProductImage(
                    product,
                  );

                const discount =
                  getDiscountPercentage(
                    product,
                  );

                return (
                  <article
                    key={product.id}
                    className="shop-card group overflow-hidden rounded-[22px] border border-black/7 bg-white shadow-[0_8px_35px_rgba(17,17,17,0.035)] transition duration-500 hover:-translate-y-1.5 hover:border-black/12 hover:shadow-[0_20px_50px_rgba(17,17,17,0.10)]"
                  >
                    <Link
                      href={`/product/${product.slug}`}
                      className="block"
                    >
                      <div className="relative aspect-square overflow-hidden bg-[#f3f1ed]">
                        {image.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image.url}
                            alt={image.alt}
                            loading="lazy"
                            className="h-full w-full object-contain p-5 transition duration-700 ease-out group-hover:scale-110"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-xs font-medium text-black/25">
                            Image unavailable
                          </div>
                        )}

                        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {product.isFeatured && (
                              <span className="rounded-full bg-[#111111] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                                Featured
                              </span>
                            )}

                            {discount > 0 && (
                              <span className="rounded-full bg-[#d71920] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                                -{discount}%
                              </span>
                            )}
                          </div>

                          <span className="grid size-8 place-items-center rounded-full border border-black/8 bg-white/90 text-black/50 opacity-0 shadow-sm backdrop-blur transition duration-300 group-hover:opacity-100">
                            <ArrowUpRight
                              size={13}
                            />
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-[9px] font-bold uppercase tracking-[0.15em] text-[#d71920]">
                            {product.category
                              ?.name ??
                              "Oscar Trading"}
                          </p>
                        </div>

                        <h3 className="mt-2 min-h-[42px] text-sm font-bold leading-5 tracking-[-0.01em] text-black sm:text-[15px]">
                          {product.name}
                        </h3>

                        {product.shortDescription && (
                          <p className="mt-2 line-clamp-2 min-h-[32px] text-[11px] leading-4 text-black/40">
                            {
                              product.shortDescription
                            }
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-end gap-2">
                          <span className="text-base font-black tracking-[-0.02em] text-black">
                            {formatPrice(
                              product.price,
                              store.currency,
                            )}
                          </span>

                          {product.compareAtPrice &&
                            Number(
                              product.compareAtPrice,
                            ) >
                              Number(
                                product.price,
                              ) && (
                              <span className="pb-0.5 text-[10px] font-medium text-black/30 line-through">
                                {formatPrice(
                                  product.compareAtPrice,
                                  store.currency,
                                )}
                              </span>
                            )}
                        </div>
                      </div>
                    </Link>

                    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                      <Link
                        href={`/product/${product.slug}`}
                        className="group/button flex items-center justify-center gap-2 rounded-xl bg-[#111111] px-3 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#d71920]"
                      >
                        View product

                        <ArrowUpRight
                          size={12}
                          className="transition-transform duration-300 group-hover/button:-translate-y-0.5 group-hover/button:translate-x-0.5"
                        />
                      </Link>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div className="shop-empty rounded-[28px] border border-black/7 bg-white px-6 py-20 text-center shadow-[0_10px_40px_rgba(17,17,17,0.04)]">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#111111] text-white">
              <Search size={24} />
            </div>

            <h3 className="mt-6 text-2xl font-black tracking-[-0.03em]">
              Nothing matched your search
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/40">
              Try another product name,
              search phrase or category.
            </p>

            <Link
              href="/shop"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d71920] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#111111]"
            >
              Browse everything
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
      </section>

      {/* BOTTOM CTA */}
      <section className="mx-auto max-w-[1500px] px-5 pb-10 sm:px-8 lg:px-12 lg:pb-16">
        <div className="relative overflow-hidden rounded-[28px] bg-[#111111] px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#d71920]/25 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d71920]">
                Oscar Trading
              </p>

              <h3 className="mt-2 max-w-2xl text-2xl font-black tracking-[-0.035em] sm:text-3xl">
                Made for everyday living.
              </h3>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                Explore the full Oscar Trading
                collection and discover pieces that
                belong in your home.
              </p>
            </div>

            <Link
              href="/shop"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-bold text-[#111111] transition hover:bg-[#d71920] hover:text-white"
            >
              Shop collection
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}