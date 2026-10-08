"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  ShieldCheck,
  Headphones,
  Truck,
  UserRound,
  CreditCard,
  MapPin,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  shortDescription: string | null;
  isFeatured: boolean;
  createdAt: string;
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

type HomeClientProps = {
  store: {
    name: string;
    displayName: string | null;
    tagline: string | null;
    logoUrl: string | null;
    slug: string;
    currency: string;
    primaryColor: string;
  };
  categories: Category[];
  products: Product[];
  heroOfferPercent: number;
};

function resolveImageUrl(value: string | null | undefined) {
  if (!value) return "";

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

  const publicIndex = url.toLowerCase().indexOf("/public/");
  if (publicIndex >= 0) {
    url = url.slice(publicIndex + 8);
  }

  return url.startsWith("/") ? url : `/${url}`;
}

function productImage(product: Product | null | undefined) {
  const image =
    product?.images?.find((item) => item.isPrimary) ??
    product?.images?.[0];

  return {
    src: resolveImageUrl(image?.imageUrl),
    alt: image?.altText || product?.name || "Product",
  };
}

function formatPrice(value: string | number | null, currency: string) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return `${currency} 0.00`;
  }

  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function discountPercentage(product: Product) {
  const price = Number(product.price);
  const compare = Number(product.compareAtPrice);

  if (!Number.isFinite(price) || !Number.isFinite(compare) || compare <= price) {
    return 0;
  }

  return Math.round(((compare - price) / compare) * 100);
}

function categoryHref(storeSlug: string, slug: string) {
  return `/shop?store=${encodeURIComponent(
    storeSlug,
  )}&category=${encodeURIComponent(slug)}`;
}

const HERO_DEFAULTS = [
  {
    eyebrow: "WELCOME TO OUR STORE",
    title: "Discover",
    accent: "Something Great",
    description:
      "Explore quality products selected for everyday value, convenience, and style.",
  },
  {
    eyebrow: "SHOP SMART",
    title: "Quality for",
    accent: "Everyday Living",
    description:
      "Find products that fit your lifestyle, with a simple and convenient shopping experience.",
  },
  {
    eyebrow: "SPECIAL OFFERS",
    title: "Great Value",
    accent: "Starts Here",
    description:
      "Discover featured products and current offers from your store.",
  },
] as const;

export default function HomeClient({
  store,
  categories,
  products,
  heroOfferPercent,
}: HomeClientProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const storeName = store.displayName?.trim() || store.name;

  const storeTagline =
    store.tagline?.trim() || "Quality products for everyday living";

  const storeInitials =
    storeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "S";

  const router = useRouter();

  const heroSlides = HERO_DEFAULTS.map((slide, index) => ({
    ...slide,
    image:
      productImage(products[index] ?? products[0]).src ||
      store.logoUrl ||
      "",
  }));

  const [activeHero, setActiveHero] = useState(0);

  const currentHero = heroSlides[activeHero] ?? heroSlides[0];

  const featuredProducts = products.filter(
    (product) => product.isFeatured,
  );

  const displayProducts =
    featuredProducts.length > 0
      ? featuredProducts.slice(0, 5)
      : products.slice(0, 5);

  const secondRowProducts = products
    .filter(
      (product) =>
        !displayProducts.some((item) => item.id === product.id),
    )
    .slice(0, 5);

  const dealProducts = products.filter(
    (product) => discountPercentage(product) > 0,
  );

  const dealProduct = dealProducts[0] ?? products[1] ?? null;

  const categoryWithProducts = categories
    .slice(0, 8)
    .map((category) => ({
      ...category,
      product: products.find(
        (product) => product.category?.id === category.id,
      ),
    }));

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const intro = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      intro
        .from(".store-topbar", {
          y: -18,
          opacity: 0,
          duration: 0.45,
        })
        .from(
          ".store-header-item",
          {
            y: -12,
            opacity: 0,
            duration: 0.45,
            stagger: 0.04,
          },
          "-=0.2",
        )
        .from(
          ".store-nav-item",
          {
            y: -10,
            opacity: 0,
            duration: 0.35,
            stagger: 0.035,
          },
          "-=0.2",
        )
        .from(
          ".hero-copy > *",
          {
            y: 24,
            opacity: 0,
            duration: 0.6,
            stagger: 0.07,
          },
          "-=0.05",
        )
        .from(
          ".hero-media",
          {
            x: 55,
            opacity: 0,
            scale: 0.96,
            duration: 0.85,
          },
          "-=0.52",
        )
        .from(
          ".hero-badge",
          {
            scale: 0.72,
            opacity: 0,
            duration: 0.45,
          },
          "-=0.35",
        );

      gsap.utils
        .toArray<HTMLElement>(".reveal-section")
        .forEach((section) => {
          gsap.from(section.querySelectorAll(".reveal-item"), {
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              once: true,
            },
            y: 24,
            opacity: 0,
            duration: 0.55,
            stagger: 0.06,
            ease: "power3.out",
          });
        });
    },
    { scope: rootRef },
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveHero(
        (current) => (current + 1) % HERO_DEFAULTS.length,
      );
    }, 6500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function moveHero(direction: number) {
    setActiveHero(
      (current) =>
        (current + direction + heroSlides.length) %
        heroSlides.length,
    );
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const search = String(formData.get("search") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();

    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (category) params.set("category", category);

    params.set("store", store.slug);

    const query = params.toString();

    router.push(`/shop?${query}`);
  }

  return (
    <main
      ref={rootRef}
      className="min-h-screen bg-white text-[#111111]"
      style={
        {
          "--store-primary": store.primaryColor,
        } as CSSProperties
      }
    >
      {/* MAIN HEADER */}
      <header className="border-b border-black/7 bg-white">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10">
          <div className="flex min-h-[90px] items-center gap-4 lg:gap-7">
            <Link
              href={`/?store=${encodeURIComponent(store.slug)}`}
              className="store-header-item flex shrink-0 items-center gap-3"
            >
              {store.logoUrl ? (
                <span
                  className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] bg-white shadow-sm"
                  style={{
                    borderColor: "var(--store-primary)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.logoUrl}
                    alt={storeName}
                    className="h-full w-full object-contain p-1.5"
                  />
                </span>
              ) : (
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-full border-[3px] bg-white text-base font-black shadow-sm"
                  style={{
                    borderColor: "var(--store-primary)",
                    color: "var(--store-primary)",
                  }}
                >
                  {storeInitials.slice(0, 2)}
                </span>
              )}

              <span className="min-w-0 leading-none">
                <span className="block max-w-[260px] truncate text-[22px] font-black tracking-[-0.045em] sm:text-[25px]">
                  {storeName}
                </span>

                <span className="mt-1 block max-w-[300px] truncate text-[8px] font-bold uppercase tracking-[0.18em] text-black/40">
                  {storeTagline}
                </span>
              </span>
            </Link>

            <form
              onSubmit={submitSearch}
              className="store-header-item hidden min-w-0 flex-1 md:block"
            >
              <div className="flex overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_4px_16px_rgba(17,17,17,0.03)] focus-within:border-[var(--store-primary)]/35">
                <select
                  name="category"
                  aria-label="Product category"
                  className="hidden w-[142px] border-r border-black/8 bg-white px-3 text-[10px] font-semibold text-black/55 outline-none lg:block"
                >
                  <option value="">All Categories</option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.slug}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

                <div className="grid w-11 place-items-center text-black/30">
                  <Search size={17} />
                </div>

                <input
                  name="search"
                  type="search"
                  placeholder="Search for products, brands, or categories..."
                  className="min-w-0 flex-1 bg-transparent px-1 py-3.5 text-xs outline-none placeholder:text-black/30"
                />

                <button
                  type="submit"
                  aria-label="Search"
                  className="m-1 inline-flex w-12 items-center justify-center rounded-lg bg-[var(--store-primary)] text-white transition hover:bg-[#111111]"
                >
                  <Search size={16} />
                </button>
              </div>
            </form>

            <div className="store-header-item ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
              <Link
                href={`/account?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="hidden items-center gap-2 rounded-xl px-2.5 py-2 transition hover:bg-[#f6f5f2] sm:flex"
              >
                <UserRound
                  size={20}
                  className="text-black/75"
                />

                <span className="text-[10px] font-bold leading-4">
                  Account
                  <span className="block font-normal text-black/35">
                    Login / Register
                  </span>
                </span>
              </Link>

              <Link
                href={`/wishlist?store=${encodeURIComponent(
                  store.slug,
                )}`}
                aria-label="Wishlist"
                className="grid size-10 place-items-center rounded-xl text-black/65 transition hover:bg-[#f6f5f2] hover:text-[var(--store-primary)]"
              >
                <Heart size={19} />
              </Link>

              <Link
                href={`/cart?store=${encodeURIComponent(
                  store.slug,
                )}`}
                aria-label="Cart"
                className="relative grid size-10 place-items-center rounded-xl bg-[#111111] text-white transition hover:bg-[var(--store-primary)]"
              >
                <ShoppingBag size={18} />

                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--store-primary)] text-[8px] font-black">
                  0
                </span>
              </Link>
            </div>
          </div>

          {/* MOBILE SEARCH */}
          <form
            onSubmit={submitSearch}
            className="store-header-item mb-3 md:hidden"
          >
            <div className="flex overflow-hidden rounded-xl border border-black/10 bg-[#faf9f7]">
              <div className="grid w-11 place-items-center text-black/30">
                <Search size={16} />
              </div>

              <input
                name="search"
                type="search"
                placeholder="Search products..."
                className="min-w-0 flex-1 bg-transparent py-3 text-xs outline-none"
              />

              <button
                type="submit"
                className="bg-[var(--store-primary)] px-4 text-xs font-bold text-white"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </header>

      {/* NAVIGATION */}
      <nav className="store-nav border-b border-black/10 bg-[#111111] text-white">
        <div className="mx-auto flex max-w-[1500px] items-center px-4 sm:px-6 lg:px-10">
          <Link
            href={`/shop?store=${encodeURIComponent(store.slug)}`}
            className="store-nav-item inline-flex h-12 items-center gap-3 bg-[var(--store-primary)] px-5 text-[10px] font-black uppercase tracking-[0.12em]"
          >
            <Menu size={16} />
            <span>All Categories</span>
          </Link>

          <div className="flex flex-1 items-center gap-7 overflow-x-auto px-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href={`/?store=${encodeURIComponent(store.slug)}`}
              className="store-nav-item relative flex h-12 shrink-0 items-center text-[10px] font-black uppercase tracking-[0.12em] text-white after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:bg-[var(--store-primary)]"
            >
              Home
            </Link>

            <Link
              href={`/shop?store=${encodeURIComponent(store.slug)}`}
              className="store-nav-item shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65 transition hover:text-white"
            >
              Shop
            </Link>

            <Link
              href={`/shop?store=${encodeURIComponent(store.slug)}`}
              className="store-nav-item inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65 transition hover:text-white"
            >
              Categories
              <ChevronDown size={12} />
            </Link>

            <Link
              href={`/shop?store=${encodeURIComponent(store.slug)}`}
              className="store-nav-item inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65 transition hover:text-white"
            >
              Offers
              <span className="rounded bg-[var(--store-primary)] px-1.5 py-0.5 text-[7px] font-black text-white">
                HOT
              </span>
            </Link>

            <a
              href="#about"
              className="store-nav-item shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65 transition hover:text-white"
            >
              About
            </a>

            <a
              href="#contact"
              className="store-nav-item shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65 transition hover:text-white"
            >
              Contact
            </a>
          </div>

          <div className="hidden shrink-0 items-center gap-2 text-[8px] font-bold uppercase tracking-[0.13em] text-white/30 lg:flex">
            <span className="size-1.5 rounded-full bg-[var(--store-primary)]" />
            Islandwide delivery
          </div>
        </div>
      </nav>

      {/* HERO CAROUSEL */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-[1500px] px-0 sm:px-4 lg:px-6">
          <div className="relative min-h-[390px] overflow-hidden bg-[#f4efe7] sm:min-h-[470px] lg:min-h-[535px]">
            {heroSlides.map((slide, index) => (
              <div
                key={`${index}-${slide.image || "store"}`}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  activeHero === index
                    ? "z-10 opacity-100"
                    : "z-0 opacity-0"
                }`}
                aria-hidden={activeHero !== index}
              >
                {slide.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slide.image}
                    alt={`${storeName} storefront collection`}
                    className="h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(135deg,#f5f5f5_0%,#ffffff_52%,#ececec_100%)]" />
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-white/5" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/[0.04] via-transparent to-transparent" />
              </div>
            ))}

            <div className="relative z-20 flex min-h-[390px] items-center px-8 py-12 sm:min-h-[470px] sm:px-12 lg:min-h-[535px] lg:px-16">
              <div className="hero-copy max-w-[500px]">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-black/45">
                  <span>{currentHero.eyebrow}</span>
                  <span className="h-px w-10 bg-[var(--store-primary)]" />
                </div>

                <h1 className="mt-4 text-[46px] font-black leading-[0.93] tracking-[-0.065em] text-[#111111] sm:text-[60px] lg:text-[72px]">
                  {currentHero.title}

                  <span className="block text-[var(--store-primary)]">
                    {currentHero.accent}
                  </span>
                </h1>

                <p className="mt-5 max-w-[420px] text-sm leading-6 text-black/50 sm:text-[15px]">
                  {currentHero.description}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href={`/shop?store=${encodeURIComponent(
                      store.slug,
                    )}`}
                    className="group inline-flex items-center gap-2 rounded-lg bg-[var(--store-primary)] px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.12)] transition hover:bg-[#111111]"
                  >
                    Shop now
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>

                  <Link
                    href={`/shop?store=${encodeURIComponent(
                      store.slug,
                    )}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white/90 px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.12em] text-black/72 backdrop-blur transition hover:border-black/20 hover:text-[var(--store-primary)]"
                  >
                    Explore collection
                    <ArrowUpRight size={13} />
                  </Link>
                </div>

                <div className="mt-8 flex items-center gap-2">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={`${index}-${slide.image || "store"}`}
                      type="button"
                      aria-label={`Show hero slide ${index + 1}`}
                      aria-pressed={activeHero === index}
                      onClick={() => setActiveHero(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeHero === index
                          ? "w-8 bg-[var(--store-primary)]"
                          : "w-2 bg-black/15 hover:bg-black/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div
              className="hero-media pointer-events-none absolute inset-0 z-0"
              aria-hidden="true"
            />

            <div className="hero-badge absolute right-5 top-5 z-30 grid size-24 place-items-center rounded-full bg-[var(--store-primary)] text-center text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:right-8 sm:top-8 sm:size-28">
              <div>
                <span className="block text-[8px] font-bold uppercase tracking-[0.14em] text-white/70">
                  Up to
                </span>

                <span className="block text-3xl font-black leading-none sm:text-4xl">
                  {heroOfferPercent}%
                </span>

                <span className="block text-[9px] font-black uppercase tracking-[0.16em]">
                  Off
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label="Previous hero slide"
              onClick={() => moveHero(-1)}
              className="absolute left-4 top-1/2 z-30 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black/70 shadow-lg backdrop-blur transition hover:bg-[#111111] hover:text-white sm:left-5"
            >
              <ChevronRight
                size={18}
                className="rotate-180"
              />
            </button>

            <button
              type="button"
              aria-label="Next hero slide"
              onClick={() => moveHero(1)}
              className="absolute right-4 top-1/2 z-30 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black/70 shadow-lg backdrop-blur transition hover:bg-[#111111] hover:text-white sm:right-5"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-b border-black/7 bg-white">
        <div className="mx-auto grid max-w-[1500px] grid-cols-2 divide-y divide-black/7 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:px-5 lg:px-10">
          {[
            {
              icon: Truck,
              title: "Free Delivery",
              text: "On orders over Rs. 5,000",
            },
            {
              icon: CreditCard,
              title: "Secure Payment",
              text: "Safe checkout",
            },
            {
              icon: ShieldCheck,
              title: "Quality Guarantee",
              text: "Genuine products only",
            },
            {
              icon: Headphones,
              title: "Customer Support",
              text: "We're here to help",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="reveal-item flex items-center gap-3 px-5 py-6 lg:px-7"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#fff3f3] text-[var(--store-primary)]">
                  <Icon size={19} />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.08em]">
                    {item.title}
                  </p>

                  <p className="mt-1 text-[9px] text-black/40">
                    {item.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="reveal-section bg-white">
        <div className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
          <div className="flex items-end justify-between gap-4">
            <div className="reveal-item">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                  Shop by{" "}
                  <span className="text-[var(--store-primary)]">
                    Category
                  </span>
                </h2>

                <span className="hidden h-[2px] w-10 bg-[var(--store-primary)] sm:block" />
              </div>

              <p className="mt-2 text-xs text-black/40">
                Browse the collections that make everyday shopping easier.
              </p>
            </div>

            <Link
              href={`/shop?store=${encodeURIComponent(
                store.slug,
              )}`}
              className="reveal-item inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--store-primary)]"
            >
              View all categories
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categoryWithProducts.map((category) => {
              const image = category.product
                ? productImage(category.product)
                : null;

              return (
                <Link
                  key={category.id}
                  href={categoryHref(
                    store.slug,
                    category.slug,
                  )}
                  className="category-item reveal-item group flex flex-col items-center text-center"
                >
                  <div className="relative grid aspect-square w-full max-w-[132px] place-items-center overflow-hidden rounded-full border border-black/6 bg-[#f7f5f1] shadow-[0_8px_22px_rgba(17,17,17,0.03)] transition duration-400 group-hover:-translate-y-1 group-hover:border-[var(--store-primary)]/20 group-hover:bg-white group-hover:shadow-[0_16px_35px_rgba(17,17,17,0.08)]">
                    {image?.src ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="h-full w-full object-contain p-4 transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-[0.1em] text-black/20">
                        Shop
                      </span>
                    )}
                  </div>

                  <p className="mt-3 max-w-[120px] text-[10px] font-bold leading-4 text-black/75 group-hover:text-[var(--store-primary)]">
                    {category.name}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="reveal-section bg-[#f7f5f1]">
        <div className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
          <div className="flex items-end justify-between gap-4">
            <div className="reveal-item">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                  Featured{" "}
                  <span className="text-[var(--store-primary)]">
                    Products
                  </span>
                </h2>

                <span className="hidden h-[2px] w-10 bg-[var(--store-primary)] sm:block" />
              </div>

              <p className="mt-2 text-xs text-black/40">
                {`Selected products from the ${storeName} collection.`}
              </p>
            </div>

            <Link
              href={`/shop?store=${encodeURIComponent(
                store.slug,
              )}`}
              className="reveal-item inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--store-primary)]"
            >
              View all products
              <ArrowRight size={13} />
            </Link>
          </div>

          {displayProducts.length > 0 ? (
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {displayProducts.map((product) => {
                const image = productImage(product);
                const discount = discountPercentage(product);

                return (
                  <article
                    key={product.id}
                    className="product-card reveal-item group overflow-hidden rounded-xl border border-black/7 bg-white transition duration-500 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(17,17,17,0.09)]"
                  >
                    <Link
                      href={`/product/${product.slug}?store=${encodeURIComponent(
                        store.slug,
                      )}`}
                      className="block"
                    >
                      <div className="relative aspect-square overflow-hidden bg-[#f5f4f1]">
                        {image.src ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={image.src}
                            alt={image.alt}
                            loading="lazy"
                            className="h-full w-full object-contain p-5 transition duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-[9px] font-bold uppercase tracking-[0.1em] text-black/20">
                            Image unavailable
                          </div>
                        )}

                        {discount > 0 ? (
                          <span className="absolute left-3 top-3 rounded bg-[var(--store-primary)] px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-white">
                            {discount}% Off
                          </span>
                        ) : null}

                        <button
                          type="button"
                          aria-label="Wishlist"
                          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/90 text-black/35 shadow-sm backdrop-blur transition hover:text-[var(--store-primary)]"
                          onClick={(event) =>
                            event.preventDefault()
                          }
                        >
                          <Heart size={14} />
                        </button>
                      </div>

                      <div className="p-4">
                        <p className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-black/35">
                          {product.category?.name ?? storeName}
                        </p>

                        <h3 className="mt-2 min-h-[38px] text-[13px] font-bold leading-5 tracking-[-0.01em]">
                          {product.name}
                        </h3>

                        {product.shortDescription ? (
                          <p className="mt-1.5 line-clamp-2 min-h-[28px] text-[9px] leading-4 text-black/38">
                            {product.shortDescription}
                          </p>
                        ) : (
                          <div className="h-[28px]" />
                        )}

                        <div className="mt-3 flex items-end gap-2">
                          <span className="text-sm font-black text-[var(--store-primary)] sm:text-[15px]">
                            {formatPrice(
                              product.price,
                              store.currency,
                            )}
                          </span>

                          {product.compareAtPrice &&
                          Number(product.compareAtPrice) >
                            Number(product.price) ? (
                            <span className="pb-0.5 text-[9px] text-black/30 line-through">
                              {formatPrice(
                                product.compareAtPrice,
                                store.currency,
                              )}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <div className="px-4 pb-4">
                      <Link
                        href={`/product/${product.slug}?store=${encodeURIComponent(
                          store.slug,
                        )}`}
                        className="flex items-center justify-center gap-2 rounded-lg bg-[#111111] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[var(--store-primary)]"
                      >
                        View product
                        <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-7 rounded-xl border border-dashed border-black/10 bg-white p-12 text-center text-sm font-semibold">
              Add your first products to showcase them here.
            </div>
          )}
        </div>
      </section>

      {/* PROMO */}
      <section
        id="offers"
        className="reveal-section bg-white"
      >
        <div className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 lg:px-10">
          <div className="relative overflow-hidden rounded-2xl bg-[var(--store-primary)]">
            <div className="absolute left-1/2 top-0 h-full w-[36%] -skew-x-[18deg] bg-white/8" />

            <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_45%_45%,rgba(0,0,0,0.25),transparent_60%)]" />

            <div className="relative grid min-h-[245px] gap-6 px-6 py-8 text-white sm:px-10 sm:py-10 lg:grid-cols-[0.75fr_1fr_0.55fr] lg:items-center">
              <div className="reveal-item">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">
                  Special offer
                </p>

                <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-[-0.04em] sm:text-5xl">
                  {heroOfferPercent > 0
                    ? `Up to ${heroOfferPercent}% off`
                    : "Special offers"}
                </h2>

                <p className="mt-3 max-w-sm text-xs font-medium uppercase tracking-[0.09em] text-white/70">
                  Featured products and current offers from{" "}
                  {storeName}
                </p>

                <Link
                  href={
                    dealProduct
                      ? `/product/${dealProduct.slug}?store=${encodeURIComponent(
                          store.slug,
                        )}`
                      : `/shop?store=${encodeURIComponent(
                          store.slug,
                        )}`
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#111111] transition hover:bg-[#111111] hover:text-white"
                >
                  Shop now
                  <ArrowRight size={13} />
                </Link>
              </div>

              <div className="reveal-item relative flex min-h-[180px] items-center justify-center">
                {dealProduct &&
                productImage(dealProduct).src ? (
                  <>
                    <div className="absolute h-40 w-40 rounded-full bg-white/15 blur-3xl" />

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productImage(dealProduct).src}
                      alt={productImage(dealProduct).alt}
                      className="relative z-10 max-h-[210px] w-[75%] object-contain drop-shadow-[0_25px_25px_rgba(0,0,0,0.25)]"
                      loading="lazy"
                    />
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-7xl font-black">
                      {heroOfferPercent > 0
                        ? `${heroOfferPercent}%`
                        : "SALE"}
                    </p>

                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
                      selected offers
                    </p>
                  </div>
                )}
              </div>

              <div className="reveal-item rounded-xl bg-white p-5 text-[#111111] shadow-2xl">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--store-primary)]">
                  {`Why shop ${storeName}?`}
                </p>

                <h3 className="mt-2 text-xl font-black tracking-[-0.03em]">
                  Quality products. Better value.
                </h3>

                <div className="mt-4 space-y-2 text-[10px] font-semibold text-black/60">
                  <p>✓ Carefully selected everyday products</p>
                  <p>✓ Easy online shopping experience</p>
                  <p>✓ Islandwide delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MORE PRODUCTS */}
      {secondRowProducts.length > 0 ? (
        <section className="reveal-section bg-white">
          <div className="mx-auto max-w-[1500px] px-5 pb-10 sm:px-8 lg:px-10">
            <div className="flex items-end justify-between gap-4">
              <div className="reveal-item">
                <h2 className="text-2xl font-black tracking-[-0.04em]">
                  More{" "}
                  <span className="text-[var(--store-primary)]">
                    Picks
                  </span>
                </h2>

                <p className="mt-2 text-xs text-black/40">
                  {`Explore more from the current ${storeName} collection.`}
                </p>
              </div>

              <Link
                href={`/shop?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="reveal-item inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--store-primary)]"
              >
                View all
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {secondRowProducts.map((product) => {
                const image = productImage(product);
                const discount = discountPercentage(product);

                return (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}?store=${encodeURIComponent(
                      store.slug,
                    )}`}
                    className="reveal-item group flex items-center gap-3 rounded-xl border border-black/7 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f6f4ef]">
                      {image.src ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={image.src}
                          alt={image.alt}
                          loading="lazy"
                          className="h-full w-full object-contain p-2"
                        />
                      ) : null}

                      {discount > 0 ? (
                        <span className="absolute left-1.5 top-1.5 rounded bg-[var(--store-primary)] px-1.5 py-1 text-[7px] font-black text-white">
                          -{discount}%
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[8px] font-black uppercase tracking-[0.12em] text-black/35">
                        {product.category?.name ?? storeName}
                      </p>

                      <h3 className="mt-1.5 line-clamp-2 text-[11px] font-bold leading-4">
                        {product.name}
                      </h3>

                      <p className="mt-2 text-xs font-black text-[var(--store-primary)]">
                        {formatPrice(
                          product.price,
                          store.currency,
                        )}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* NEWSLETTER */}
      <section className="border-y border-black/7 bg-[#fff4f4]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="reveal-item flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-white text-[var(--store-primary)] shadow-sm">
              <Search size={18} />
            </div>

            <div>
              <h2 className="text-base font-black sm:text-lg">
                Subscribe to our newsletter
              </h2>

              <p className="mt-1 text-[10px] text-black/45">
                Get updates on new arrivals, offers and exclusive deals.
              </p>
            </div>
          </div>

          <form className="reveal-item flex w-full max-w-xl overflow-hidden rounded-xl border border-black/8 bg-white">
            <input
              type="email"
              required
              placeholder="Enter your email address"
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-xs outline-none placeholder:text-black/30"
            />

            <button
              type="button"
              className="bg-[var(--store-primary)] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#111111]"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        id="about"
        className="bg-[#111111] text-white"
      >
        <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.35fr_.7fr_.85fr_1fr] lg:px-10">
          <div className="reveal-item">
            <Link
              href={`/?store=${encodeURIComponent(
                store.slug,
              )}`}
              className="inline-flex items-center gap-3"
            >
              {store.logoUrl ? (
                <span className="grid size-11 place-items-center overflow-hidden rounded-full bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={store.logoUrl}
                    alt={storeName}
                    className="h-full w-full object-contain p-1.5"
                  />
                </span>
              ) : (
                <span
                  className="grid size-11 place-items-center rounded-full text-base font-black text-white"
                  style={{
                    backgroundColor: "var(--store-primary)",
                  }}
                >
                  {storeInitials.slice(0, 2)}
                </span>
              )}

              <span className="leading-none">
                <span className="block max-w-[300px] truncate text-[22px] font-black">
                  {storeName}
                </span>

                <span className="mt-1 block max-w-[320px] truncate text-[8px] font-bold uppercase tracking-[0.18em] text-white/35">
                  {storeTagline}
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-xs leading-6 text-white/40">
              Your trusted destination for quality products,
              built around value and everyday convenience.
            </p>

            <div className="mt-5 flex gap-2">
              {[
                ["Facebook", "f"],
                ["Instagram", "◎"],
                ["WhatsApp", "◉"],
                ["YouTube", "▶"],
              ].map(([label, icon]) => (
                <a
                  key={label}
                  href="#contact"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-full border border-white/10 text-xs font-black text-white/45 transition hover:border-[var(--store-primary)] hover:bg-[var(--store-primary)] hover:text-white"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          <div className="reveal-item">
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em]">
              Quick Links
            </h3>

            <div className="mt-4 space-y-2.5 text-xs text-white/40">
              <Link
                href={`/?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                Home
              </Link>

              <Link
                href={`/shop?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                Shop
              </Link>

              <Link
                href={`/shop?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                Categories
              </Link>

              <Link
                href={`/shop?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                Offers
              </Link>

              <a
                href="#about"
                className="block hover:text-white"
              >
                About Us
              </a>

              <a
                href="#contact"
                className="block hover:text-white"
              >
                Contact
              </a>
            </div>
          </div>

          <div className="reveal-item">
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em]">
              Customer Service
            </h3>

            <div className="mt-4 space-y-2.5 text-xs text-white/40">
              <Link
                href={`/account?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                My Account
              </Link>

              <Link
                href={`/track-order?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                Track Order
              </Link>

              <Link
                href={`/wishlist?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                Wishlist
              </Link>

              <Link
                href={`/returns?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                Returns & Refunds
              </Link>

              <Link
                href={`/shipping?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                Shipping Policy
              </Link>

              <Link
                href={`/faq?store=${encodeURIComponent(
                  store.slug,
                )}`}
                className="block hover:text-white"
              >
                FAQ
              </Link>
            </div>
          </div>

          <div
            id="contact"
            className="reveal-item"
          >
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em]">
              Categories
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs text-white/40">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  href={categoryHref(
                    store.slug,
                    category.slug,
                  )}
                  className="hover:text-white"
                >
                  {category.name}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-3 border-t border-white/8 pt-5">
              <span className="text-[9px] font-black uppercase tracking-[0.13em] text-white/30">
                We accept
              </span>

              <span className="rounded bg-white px-2 py-1 text-[8px] font-black text-[#1a4aa3]">
                VISA
              </span>

              <span className="rounded bg-white px-2 py-1 text-[8px] font-black text-black">
                Mastercard
              </span>

              <span className="rounded bg-white px-2 py-1 text-[8px] font-black text-[#1976b9]">
                AMEX
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-5 py-5 text-[9px] text-white/25 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p>
              © {new Date().getFullYear()} {store.name}. All Rights Reserved.
            </p>

            <p>Secure shopping • Islandwide delivery</p>
          </div>
        </div>
      </footer>
    </main>
  );
}