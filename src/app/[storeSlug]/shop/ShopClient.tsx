"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useRef } from "react";
import type { CSSProperties, FormEvent } from "react";
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
    slug: string;
    currency: string;
    primaryColor: string;
    logoUrl: string | null;
    tagline: string | null;
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

  try {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function resolveImageUrl(
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  let url = value.trim().replace(/\\/g, "/");

  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  url = url
    .replace(/^\.\/+/, "")
    .replace(/^public\//i, "")
    .replace(/^\/public\//i, "/");

  const publicIndex = url
    .toLowerCase()
    .indexOf("/public/");

  if (publicIndex >= 0) {
    url = url.slice(publicIndex + 8);
  }

  return url.startsWith("/")
    ? url
    : `/${url}`;
}

function getProductImage(product: Product) {
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

function getStoreInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase(),
    )
    .join("");

  return initials || "S";
}

function categoryHref(
  storeSlug: string,
  slug: string,
  search: string,
) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  params.set("category", slug);

  return `/${encodeURIComponent(storeSlug)}/shop?${params.toString()}`;
}

function shopHref(
  storeSlug: string,
  search = "",
  category = "",
) {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  if (category) {
    params.set("category", category);
  }

  const query = params.toString();

  return `/${encodeURIComponent(storeSlug)}/shop${query ? `?${query}` : ""}`;
}

function productHref(
  storeSlug: string,
  productSlug: string,
) {
  return `/${encodeURIComponent(storeSlug)}/product/${encodeURIComponent(productSlug)}`;
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

  const storeInitials =
    getStoreInitials(store.name);

  const heroProducts =
    products.slice(0, 3);

  const primaryHeroProduct =
    heroProducts[0] ?? null;

  const primaryHeroImage =
    primaryHeroProduct
      ? getProductImage(
          primaryHeroProduct,
        )
      : null;

  useGSAP(
    () => {
      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
      ) {
        return;
      }

      const timeline =
        gsap.timeline({
          defaults: {
            ease: "power3.out",
          },
        });

      timeline
        .from(".shop-brand-line", {
          opacity: 0,
          y: 12,
          duration: 0.4,
        })
        .from(
          ".shop-hero-title",
          {
            opacity: 0,
            y: 28,
            duration: 0.7,
          },
          "-=0.18",
        )
        .from(
          ".shop-hero-copy",
          {
            opacity: 0,
            y: 18,
            duration: 0.5,
          },
          "-=0.42",
        )
        .from(
          ".shop-hero-action",
          {
            opacity: 0,
            y: 14,
            duration: 0.45,
          },
          "-=0.28",
        )
        .from(
          ".shop-hero-visual",
          {
            opacity: 0,
            x: 45,
            scale: 0.96,
            duration: 0.8,
          },
          "-=0.56",
        )
        .from(
          ".shop-hero-stat",
          {
            opacity: 0,
            y: 12,
            duration: 0.4,
            stagger: 0.08,
          },
          "-=0.45",
        )
        .from(
          ".shop-search-wrap",
          {
            opacity: 0,
            y: 18,
            duration: 0.55,
          },
          "-=0.25",
        )
        .from(
          ".shop-category-link",
          {
            opacity: 0,
            y: 10,
            duration: 0.3,
            stagger: 0.035,
          },
          "-=0.2",
        )
        .from(
          ".shop-results-heading",
          {
            opacity: 0,
            y: 14,
            duration: 0.45,
          },
          "-=0.1",
        );

      if (products.length > 0) {
        timeline.from(
          ".shop-card",
          {
            opacity: 0,
            y: 25,
            duration: 0.5,
            stagger: 0.055,
          },
          "-=0.15",
        );
      } else {
        timeline.from(
          ".shop-empty",
          {
            opacity: 0,
            y: 16,
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
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const value =
      searchInputRef.current?.value.trim() ??
      "";

    router.push(
      shopHref(
        store.slug,
        value,
        selectedCategory,
      ),
    );
  }

  const clearUrl =
    shopHref(store.slug);

  return (
    <main
      ref={rootRef}
      className="min-h-screen bg-[#f7f7f5] text-[#111111]"
      style={
        {
          "--store-primary":
            store.primaryColor,
        } as CSSProperties
      }
    >
      {/* HERO */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute right-[-120px] top-[-140px] h-[420px] w-[420px] rounded-full bg-[var(--store-primary)] opacity-[0.08] blur-3xl" />

        <div className="absolute bottom-[-180px] left-[-160px] h-[420px] w-[420px] rounded-full bg-black/[0.035] blur-3xl" />

        <div className="relative mx-auto grid max-w-[1500px] gap-10 px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-12 lg:pb-20 lg:pt-14">
          {/* LEFT */}
          <div>
            <div className="shop-brand-line flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black/35">
              {store.logoUrl ? (
                <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f2f1ed]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="h-full w-full object-contain p-1"
                  />
                </span>
              ) : (
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full text-[8px] font-black text-white"
                  style={{
                    backgroundColor:
                      "var(--store-primary)",
                  }}
                >
                  {storeInitials.slice(0, 2)}
                </span>
              )}

              <span>{store.name}</span>

              <span className="h-px w-8 bg-black/15" />

              <span
                style={{
                  color:
                    "var(--store-primary)",
                }}
              >
                Shop
              </span>
            </div>

            <h1 className="shop-hero-title mt-6 max-w-4xl text-[48px] font-black leading-[0.94] tracking-[-0.065em] sm:text-[64px] lg:text-[78px]">
              Find what
              <br />
              fits your
              <span
                className="block"
                style={{
                  color:
                    "var(--store-primary)",
                }}
              >
                everyday.
              </span>
            </h1>

            <p className="shop-hero-copy mt-6 max-w-xl text-sm leading-7 text-black/48 sm:text-[15px]">
              {store.tagline?.trim() ||
                `Explore the ${store.name} collection, from everyday essentials to carefully selected favourites.`}
            </p>

            <div className="shop-hero-action mt-7 flex flex-wrap gap-3">
              <Link
                href="#products"
                className="group inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-3 text-xs font-bold text-white transition hover:bg-[var(--store-primary)]"
              >
                Browse products

                <ArrowRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[#f7f7f5] px-4 py-3 text-xs font-semibold text-black/50">
                <Sparkles
                  size={14}
                  style={{
                    color:
                      "var(--store-primary)",
                  }}
                />

                Curated collection
              </div>
            </div>
          </div>

          {/* RIGHT VISUAL */}
          <div className="shop-hero-visual relative min-h-[390px] sm:min-h-[460px]">
            <div className="absolute right-[4%] top-[7%] h-[72%] w-[72%] rounded-full bg-[var(--store-primary)] opacity-[0.10]" />

            <div className="absolute bottom-[3%] right-[12%] h-40 w-40 rounded-full bg-black/[0.035] blur-2xl" />

            {primaryHeroImage?.url ? (
              <>
                <div className="absolute left-[10%] top-[14%] z-10 w-[46%] overflow-hidden rounded-[34px] bg-[#f2f0eb] shadow-[0_35px_80px_rgba(17,17,17,0.12)] rotate-[-5deg]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      primaryHeroImage.url
                    }
                    alt={
                      primaryHeroImage.alt
                    }
                    className="aspect-[4/5] w-full object-contain p-7 transition duration-700 hover:scale-105"
                  />
                </div>

                {heroProducts[1] &&
                getProductImage(
                  heroProducts[1],
                ).url ? (
                  <div className="absolute right-[3%] top-[2%] z-20 w-[38%] overflow-hidden rounded-[30px] bg-[#eeece7] shadow-[0_25px_65px_rgba(17,17,17,0.11)] rotate-[7deg]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        getProductImage(
                          heroProducts[1],
                        ).url
                      }
                      alt={
                        getProductImage(
                          heroProducts[1],
                        ).alt
                      }
                      className="aspect-square w-full object-contain p-6 transition duration-700 hover:scale-105"
                    />
                  </div>
                ) : null}

                {heroProducts[2] &&
                getProductImage(
                  heroProducts[2],
                ).url ? (
                  <div className="absolute bottom-[1%] right-[14%] z-20 w-[43%] overflow-hidden rounded-[34px] bg-[#f5f3ee] shadow-[0_28px_70px_rgba(17,17,17,0.13)] rotate-[4deg]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        getProductImage(
                          heroProducts[2],
                        ).url
                      }
                      alt={
                        getProductImage(
                          heroProducts[2],
                        ).alt
                      }
                      className="aspect-[4/3] w-full object-contain p-5 transition duration-700 hover:scale-105"
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="relative grid size-64 place-items-center rounded-full text-white shadow-[0_35px_80px_rgba(17,17,17,0.14)] sm:size-72"
                  style={{
                    backgroundColor:
                      "var(--store-primary)",
                  }}
                >
                  {store.logoUrl ? (
                    <div className="grid size-28 place-items-center overflow-hidden rounded-full bg-white shadow-xl sm:size-32">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={store.logoUrl}
                        alt={store.name}
                        className="h-full w-full object-contain p-5"
                      />
                    </div>
                  ) : (
                    <span className="text-7xl font-black tracking-[-0.08em] sm:text-8xl">
                      {storeInitials}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="shop-hero-stat absolute bottom-6 left-0 z-30 rounded-2xl bg-white/95 px-5 py-4 shadow-[0_18px_45px_rgba(17,17,17,0.09)] backdrop-blur">
              <p className="text-2xl font-black">
                {products.length}
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-black/35">
                Products
              </p>
            </div>

            <div className="shop-hero-stat absolute right-0 bottom-28 z-30 rounded-2xl bg-[#111111] px-5 py-4 text-white shadow-[0_18px_45px_rgba(17,17,17,0.14)]">
              <p className="text-2xl font-black">
                {categories.length}
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                Categories
              </p>
            </div>
          </div>
        </div>

        {/* FLOATING SEARCH */}
        <div className="relative z-40 mx-auto max-w-[1280px] px-5 pb-8 sm:px-8 lg:px-12 lg:pb-10">
          <form
            onSubmit={handleSearch}
            className="shop-search-wrap flex flex-col gap-2 rounded-[24px] bg-white p-2 shadow-[0_18px_55px_rgba(17,17,17,0.10)] ring-1 ring-black/[0.05] sm:flex-row"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-4">
              <Search
                size={19}
                className="shrink-0 text-black/25"
              />

              <input
                ref={searchInputRef}
                type="search"
                defaultValue={search}
                placeholder="Search products..."
                className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-black/30"
              />

              {search ? (
                <Link
                  href={shopHref(
                    store.slug,
                    "",
                    selectedCategory,
                  )}
                  aria-label="Clear search"
                  className="grid size-8 place-items-center rounded-full text-black/30 transition hover:bg-black/5 hover:text-black"
                >
                  <X size={15} />
                </Link>
              ) : null}
            </div>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-7 text-xs font-bold text-white transition hover:brightness-95"
              style={{
                backgroundColor:
                  "var(--store-primary)",
              }}
            >
              Search
              <ChevronRight size={14} />
            </button>
          </form>
        </div>
      </section>

      {/* CATEGORY NAV */}
      <section className="border-y border-black/[0.06] bg-[#f7f7f5]">
        <div className="mx-auto max-w-[1500px] px-5 py-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href={shopHref(
                store.slug,
                search,
              )}
              className={`shop-category-link shrink-0 border-b-2 px-1 pb-2 text-[11px] font-bold transition ${
                !selectedCategory
                  ? "text-[#111111]"
                  : "border-transparent text-black/40 hover:text-black"
              }`}
              style={
                !selectedCategory
                  ? {
                      borderColor:
                        "var(--store-primary)",
                    }
                  : undefined
              }
            >
              All products
            </Link>

            {categories.map(
              (category) => {
                const isActive =
                  selectedCategory ===
                  category.slug;

                return (
                  <Link
                    key={category.id}
                    href={categoryHref(
                      store.slug,
                      category.slug,
                      search,
                    )}
                    className={`shop-category-link shrink-0 border-b-2 px-1 pb-2 text-[11px] font-bold transition ${
                      isActive
                        ? "text-[#111111]"
                        : "border-transparent text-black/40 hover:text-black"
                    }`}
                    style={
                      isActive
                        ? {
                            borderColor:
                              "var(--store-primary)",
                          }
                        : undefined
                    }
                  >
                    {category.name}
                  </Link>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section
        id="products"
        className="mx-auto max-w-[1500px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20"
      >
        <div className="shop-results-heading mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{
                  color:
                    "var(--store-primary)",
                }}
              >
                {selectedCategory
                  ? "Category"
                  : search
                    ? "Search results"
                    : "Collection"}
              </p>

              <span className="h-px w-8 bg-black/10" />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                {selectedCategoryName ??
                  (search
                    ? `Results for “${search}”`
                    : "Shop all")}
              </h2>

              <span className="rounded-full bg-[#111111] px-3 py-1.5 text-[10px] font-bold text-white">
                {products.length}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/42">
              {selectedCategoryName
                ? `Explore our ${selectedCategoryName.toLowerCase()} collection.`
                : search
                  ? `Showing products matching your search in ${store.name}.`
                  : `Explore products selected for the ${store.name} storefront.`}
            </p>
          </div>

          {(search || selectedCategory) && (
            <Link
              href={clearUrl}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2.5 text-xs font-bold text-black/55 transition hover:border-black/20 hover:text-black"
            >
              <SlidersHorizontal size={14} />

              Clear filters
            </Link>
          )}
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-12 lg:grid-cols-4 xl:grid-cols-5">
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
                    className="shop-card group min-w-0"
                  >
                    <Link
                      href={productHref(
                        store.slug,
                        product.slug,
                      )}
                      className="block"
                    >
                      {/* IMAGE */}
                      <div className="relative overflow-hidden rounded-[28px] bg-[#efeee9]">
                        <div className="aspect-square">
                          {image.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image.url}
                              alt={image.alt}
                              loading="lazy"
                              className="h-full w-full object-contain p-5 transition duration-700 ease-out group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-xs font-semibold text-black/25">
                              Image unavailable
                            </div>
                          )}
                        </div>

                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          {product.isFeatured ? (
                            <span className="rounded-full bg-[#111111] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-white">
                              Featured
                            </span>
                          ) : null}

                          {discount > 0 ? (
                            <span
                              className="rounded-full px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-white"
                              style={{
                                backgroundColor:
                                  "var(--store-primary)",
                              }}
                            >
                              -{discount}%
                            </span>
                          ) : null}
                        </div>

                        <span className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/90 text-black/40 opacity-0 shadow-sm backdrop-blur transition duration-300 group-hover:opacity-100">
                          <ArrowUpRight size={14} />
                        </span>
                      </div>

                      {/* DETAILS */}
                      <div className="px-1 pt-4">
                        <p
                          className="truncate text-[9px] font-black uppercase tracking-[0.15em]"
                          style={{
                            color:
                              "var(--store-primary)",
                          }}
                        >
                          {product.category
                            ?.name ??
                            store.name}
                        </p>

                        <h3 className="mt-2 min-h-[44px] text-sm font-bold leading-5 tracking-[-0.01em] sm:text-[15px]">
                          {product.name}
                        </h3>

                        {product.shortDescription ? (
                          <p className="mt-2 line-clamp-2 min-h-[34px] text-[10px] leading-4 text-black/38">
                            {
                              product.shortDescription
                            }
                          </p>
                        ) : (
                          <div className="h-[34px]" />
                        )}

                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <span className="text-base font-black tracking-[-0.03em]">
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
                            ) ? (
                            <span className="pb-0.5 text-[10px] text-black/28 line-through">
                              {formatPrice(
                                product.compareAtPrice,
                                store.currency,
                              )}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <Link
                      href={productHref(
                        store.slug,
                        product.slug,
                      )}
                      className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#111111] px-4 py-3 text-[9px] font-black uppercase tracking-[0.13em] text-white transition hover:bg-[var(--store-primary)]"
                    >
                      View product
                      <ArrowUpRight
                        size={12}
                      />
                    </Link>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div className="shop-empty py-14 sm:py-20">
            <div className="mx-auto max-w-xl text-center">
              <div
                className="mx-auto grid size-20 place-items-center rounded-full text-white shadow-[0_20px_55px_rgba(17,17,17,0.10)]"
                style={{
                  backgroundColor:
                    "var(--store-primary)",
                }}
              >
                <Search size={27} />
              </div>

              <h3 className="mt-7 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                Nothing to show yet
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/40">
                {search ||
                selectedCategory
                  ? "Try another search or browse the complete collection."
                  : `${store.name} has not published any products yet.`}
              </p>

              <Link
                href={clearUrl}
                className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold text-white transition hover:brightness-95"
                style={{
                  backgroundColor:
                    "var(--store-primary)",
                }}
              >
                Browse everything
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* STORE CTA */}
      <section className="mx-auto max-w-[1500px] px-5 pb-12 sm:px-8 lg:px-12 lg:pb-20">
        <div className="relative overflow-hidden rounded-[32px] bg-[#111111] px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
          <div
            className="absolute right-[-80px] top-[-100px] h-64 w-64 rounded-full opacity-20 blur-3xl"
            style={{
              backgroundColor:
                "var(--store-primary)",
            }}
          />

          <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{
                  color:
                    "var(--store-primary)",
                }}
              >
                {store.name}
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Everything you need,
                <span className="block text-white/45">
                  in one place.
                </span>
              </h3>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/40">
                Discover more products from the
                current collection and find
                something that fits your everyday.
              </p>
            </div>

            <Link
              href={shopHref(
                store.slug,
              )}
              className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-bold text-[#111111] transition hover:bg-[var(--store-primary)] hover:text-white"
            >
              Shop the collection
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}