"use client";

import Image from "next/image";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";

import {

  AnimatePresence,

  LazyMotion,

  domAnimation,

  m,

  useReducedMotion,

} from "framer-motion";

import {

  ArrowRight,

  ArrowUpRight,

  ChevronLeft,

  ChevronRight,

  Heart,

  Menu,

  Phone,

  Search,

  ShoppingBag,

  UserRound,

} from "lucide-react";

import {

  FaFacebookF,

  FaInstagram,

  FaTiktok,

} from "react-icons/fa6";

type HeaderStore = {
  slug: string;
  currency: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;

  phone: string | null;

  displayName: string;

  tagline: string | null;

  logoUrl: string | null;

  primaryColor: string;

  accentColor: string;

  surfaceColor: string;

  heroOfferPercent: number;

  announcementMessages?: string[];

};

type HeaderCategory = {

  id: number;

  name: string;

  slug: string;

};

type HeaderHeroSlide = {

  id: number;

  imageUrl: string;

  eyebrow: string | null;

  title: string | null;

  accentText: string | null;

  description: string | null;

  buttonText: string | null;

  buttonUrl: string | null;

  offerPercent: number | null;

  isActive?: boolean;

};

type HeaderSearchProduct = {
  id: number;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  isAvailable: boolean;
  images: {
    imageUrl: string;
    altText: string | null;
  }[];
};

type HomeHeaderHeroProps = {

  store: HeaderStore;

  categories: HeaderCategory[];

  heroSlides: HeaderHeroSlide[];

  fallbackImage: string;

  hasSpecialOffers: boolean;

};

function normalizeImageUrl(value: string | null | undefined): string {
  if (!value) return "";

  let url = value.trim().replace(/\\/g, "/");

  if (/^(https?:\/\/|data:|blob:)/i.test(url)) {
    return url;
  }

  url = url
    .replace(/^\.\//, "")
    .replace(/^\/?public\//i, "");

  const publicIndex = url.toLowerCase().lastIndexOf("/public/");
  if (publicIndex >= 0) {
    url = url.slice(publicIndex + 8);
  }

  return url.startsWith("/") ? url : `/${url}`;
}

function isUnoptimizedUrl(src: string): boolean {
  return /^(https?:\/\/|data:|blob:)/i.test(src);
}

function safeHref(value: string | null | undefined): string {

  const href = value?.trim();

  if (!href) return "/shop";

  if (href.startsWith("/") && !href.startsWith("//")) {

    return href;

  }

  try {

    const parsed = new URL(href);

    if (parsed.protocol === "https:" || parsed.protocol === "http:") {

      return href;

    }

  } catch {

    // Use the internal shop page for invalid URLs.

  }

  return "/shop";

}

function formatSearchPrice(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} ${value}`;

  try {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-LK", {
      maximumFractionDigits: 2,
    })}`;
  }
}

export default function HomeHeaderHero({

  store,

  categories,

  heroSlides,

  fallbackImage,

  hasSpecialOffers,

}: HomeHeaderHeroProps) {

  const reducedMotion = useReducedMotion() ?? false;

  // Announcement bar state.

  const [announcementIndex, setAnnouncementIndex] = useState(0);

  // Hero carousel state.

  const [displayIndex, setDisplayIndex] = useState(0);

  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const [loadedSlideIds, setLoadedSlideIds] = useState<Set<number>>(

    () => new Set<number>(),

  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HeaderSearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const showSearchDropdown = searchFocused && searchQuery.trim().length >= 2;

  /*

   * Read announcement messages provided by the store.

   * Only the first three non-empty messages are displayed.

   */

  const announcementMessages = useMemo(() => {

    const configuredMessages = (store.announcementMessages ?? [])

      .map((message) => message.trim())

      .filter(Boolean)

      .slice(0, 3);

    // Fallback for existing stores that have not configured announcements.

    return configuredMessages.length > 0

      ? configuredMessages

      : [store.tagline?.trim() || store.displayName];

  }, [

    store.announcementMessages,

    store.displayName,

    store.tagline,

  ]);

  /*

   * Rotate announcements every 4.2 seconds.

   * Skip animation when the user prefers reduced motion.

   */

  useEffect(() => {

    if (reducedMotion || announcementMessages.length < 2) {

      return;

    }

    const timer = window.setInterval(() => {

      if (document.visibilityState !== "visible") {

        return;

      }

      setAnnouncementIndex(

        (current) => (current + 1) % announcementMessages.length,

      );

    }, 4200);

    return () => window.clearInterval(timer);

  }, [announcementMessages.length, reducedMotion]);

  // Debounced, store-scoped product autocomplete. Previous requests are cancelled on new input.
  useEffect(() => {
    const query = searchQuery.trim();

    if (!searchFocused || query.length < 2) {
      const resetTimer = window.setTimeout(() => {
        setSearchResults([]);
        setSearchLoading(false);
      }, 0);

      return () => window.clearTimeout(resetTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, store: store.slug });
        const response = await fetch(`/api/storefront-search?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        const data: {
          success?: boolean;
          products?: HeaderSearchProduct[];
        } = await response.json();

        if (!response.ok || !data.success) {
          throw new Error("Product search failed.");
        }

        setSearchResults(Array.isArray(data.products) ? data.products.slice(0, 5) : []);
      } catch {
        if (!controller.signal.aborted) {
          setSearchResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, searchFocused, store.slug]);

  const fallbackSrc = normalizeImageUrl(fallbackImage);

  const slides = useMemo<HeaderHeroSlide[]>(() => {

    const activeSlides = heroSlides

      .filter((slide) => slide.isActive !== false)

      .slice(0, 3)

      .map((slide) => ({

        ...slide,

        imageUrl: normalizeImageUrl(slide.imageUrl) || fallbackSrc,

      }));

    if (activeSlides.length > 0) {

      return activeSlides;

    }

    return [

      {

        id: -1,

        imageUrl: fallbackSrc,

        eyebrow: "THE ART OF EVERYDAY COOKING",

        title: "Make room for",

        accentText: "better moments.",

        description:

          store.tagline ||

          "Thoughtfully chosen cookware, utensils and everyday essentials for a kitchen that feels like home.",

        buttonText: "Explore the collection",

        buttonUrl: "/shop",

        offerPercent: store.heroOfferPercent,

      },

    ];

  }, [

    heroSlides,

    fallbackSrc,

    store.tagline,

    store.heroOfferPercent,

  ]);

  // Keep the currently displayed image visible until the next image loads.

  const currentIndex = displayIndex % slides.length;

  const currentSlide = slides[currentIndex] ?? slides[0];

  const transitionDuration = reducedMotion ? 0 : 0.95;

  const smoothEase = [0.22, 0.61, 0.36, 1] as const;

  function goToSlide(requestedIndex: number) {

    const nextIndex =

      ((requestedIndex % slides.length) + slides.length) % slides.length;

    if (nextIndex === currentIndex) {

      setPendingIndex(null);

      return;

    }

    const target = slides[nextIndex];

    if (loadedSlideIds.has(target.id)) {

      setDisplayIndex(nextIndex);

      setPendingIndex(null);

      return;

    }

    // Load only the requested next image before changing the banner.

    setPendingIndex(nextIndex);

  }

  function handleSlideImageLoaded(index: number) {

    const loadedId = slides[index]?.id;

    if (loadedId === undefined) return;

    setLoadedSlideIds((previous) => {

      if (previous.has(loadedId)) return previous;

      const next = new Set(previous);

      next.add(loadedId);

      return next;

    });

    if (pendingIndex === index) {

      setDisplayIndex(index);

      setPendingIndex(null);

    }

  }

  // Automatic hero slide rotation.

  useEffect(() => {

    if (reducedMotion || slides.length < 2) return;

    const timer = window.setInterval(() => {

      if (document.visibilityState !== "visible") return;

      const nextIndex = (currentIndex + 1) % slides.length;

      const target = slides[nextIndex];

      if (loadedSlideIds.has(target.id)) {

        setDisplayIndex(nextIndex);

        setPendingIndex(null);

      } else {

        setPendingIndex(nextIndex);

      }

    }, 7600);

    return () => window.clearInterval(timer);

  }, [

    currentIndex,

    loadedSlideIds,

    reducedMotion,

    slides,

  ]);

  function moveSlide(direction: number) {

    const baseIndex = pendingIndex ?? currentIndex;

    goToSlide(baseIndex + direction);

  }

  const imageIndices =

    pendingIndex !== null && pendingIndex !== currentIndex

      ? [currentIndex, pendingIndex]

      : [currentIndex];

  const logoSrc = normalizeImageUrl(store.logoUrl);

  return (

    <LazyMotion features={domAnimation} strict>
      <style jsx global>{`
        input.header-product-search-input,
        input.header-product-search-input:focus,
        input.header-product-search-input:focus-visible,
        input.header-product-search-input:active {
          border: 0 !important;
          border-color: transparent !important;
          outline: none !important;
          box-shadow: none !important;
          --tw-ring-offset-shadow: 0 0 #0000 !important;
          --tw-ring-shadow: 0 0 #0000 !important;
        }
      `}</style>

      {/* Store-configured announcement bar */}

      <m.div

  initial={reducedMotion ? false : { y: -6, opacity: 0 }}

  animate={{ y: 0, opacity: 1 }}

  transition={{

    duration: reducedMotion ? 0 : 0.65,

    ease: smoothEase,

  }}

  className="min-h-9 overflow-hidden px-4 py-2 text-[10px] font-semibold tracking-[0.12em] text-white sm:text-xs"

  style={{ backgroundColor: store.primaryColor }}

  aria-label="Store announcements"

>

  <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">

    {/* Empty left column keeps announcement centered */}

    <div className="hidden items-center justify-start gap-3 sm:flex">

  {store.facebookUrl?.trim() && (

    <a

      href={store.facebookUrl}

      target="_blank"

      rel="noopener noreferrer"

      aria-label="Facebook"

      title="Facebook"

      className="transition-opacity hover:opacity-70"

    >

      <FaFacebookF size={15} />

    </a>

  )}

  {store.instagramUrl?.trim() && (

    <a

      href={store.instagramUrl}

      target="_blank"

      rel="noopener noreferrer"

      aria-label="Instagram"

      title="Instagram"

      className="transition-opacity hover:opacity-70"

    >

      <FaInstagram size={15} />

    </a>

  )}

  {store.tiktokUrl?.trim() && (

    <a

      href={store.tiktokUrl}

      target="_blank"

      rel="noopener noreferrer"

      aria-label="TikTok"

      title="TikTok"

      className="transition-opacity hover:opacity-70"

    >

      <FaTiktok size={15} />

    </a>

  )}

</div>

    {/* Rotating announcement */}

    <div className="relative flex min-h-[18px] min-w-0 items-center justify-center overflow-hidden text-center">

      <AnimatePresence initial={false} mode="wait">

        <m.span

          key={`${announcementIndex}-${announcementMessages[announcementIndex % announcementMessages.length]}`}

          initial={reducedMotion ? false : { y: 12, opacity: 0 }}

          animate={{ y: 0, opacity: 1 }}

          exit={reducedMotion ? undefined : { y: -12, opacity: 0 }}

          transition={{

            duration: reducedMotion ? 0 : 0.52,

            ease: smoothEase,

          }}

          className="block max-w-full"

          aria-live="polite"

          aria-atomic="true"

        >

          {announcementMessages[

            announcementIndex % announcementMessages.length

          ]}

        </m.span>

      </AnimatePresence>

    </div>

    {/* Database hotline — displayed on desktop */}

    {store.phone?.trim() ? (

      <a

        href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}

        className="hidden min-w-0 items-center justify-end gap-1.5 whitespace-nowrap text-right font-bold tracking-normal sm:flex"

        aria-label={`Call ${store.phone}`}

      >

        <Phone size={12} />

        <span>Hotline: {store.phone}</span>

      </a>

    ) : (

      <div className="hidden sm:block" />

    )}

  </div>

</m.div>

      {/* Header */}

      <m.header

        initial={reducedMotion ? false : { y: -6, opacity: 0 }}

        animate={{ y: 0, opacity: 1 }}

        transition={{

          duration: reducedMotion ? 0 : 0.7,

          delay: 0.08,

          ease: smoothEase,

        }}

        className="sticky top-0 z-40 border-b border-black/10 bg-[#FBF9F4]"

      >

        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center gap-3 px-4 sm:gap-5 sm:px-7 lg:gap-8 lg:px-12">

          <Link

            href="/"

            aria-label={`${store.displayName} home`}

            className="flex min-w-0 shrink-0 items-center gap-3"

          >

            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-black/10 bg-white shadow-sm sm:size-12">

              {logoSrc ? (

                <Image

                  src={logoSrc}

                  alt={`${store.displayName} logo`}

                  width={48}

                  height={48}

                  sizes="48px"

                  unoptimized={isUnoptimizedUrl(logoSrc)}

                  className="h-full w-full rounded-full object-contain p-1"

                />

              ) : (

                <span

                  className="grid h-full w-full place-items-center rounded-full text-lg font-bold text-white"

                  style={{ backgroundColor: store.primaryColor }}

                >

                  {store.displayName.charAt(0).toUpperCase()}

                </span>

              )}

            </span>

            <span className="min-w-0">

              <span className="block truncate font-sans text-[14px] font-extrabold leading-tight tracking-[0.045em] text-[#171717] sm:text-[16px]">

  {store.displayName.toUpperCase()}

</span>

              <span className="mt-1 hidden text-[9px] tracking-[0.12em] text-black/45 sm:block">

                KITCHEN & HOME

              </span>

            </span>

          </Link>

          {/* Desktop search with live product suggestions */}
          <div
            className="relative mx-auto hidden max-w-[520px] flex-1 md:block"
            onFocus={() => setSearchFocused(true)}
            onBlur={(event) => {
              const nextTarget = event.relatedTarget;
              if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                setSearchFocused(false);
              }
            }}
          >
            <form
              action="/shop"
              method="get"
              role="search"
              className="flex items-center gap-3 rounded-full border bg-white px-4 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.025)] transition-[border-color,box-shadow] duration-200 focus-within:border-black/20 focus-within:outline-none focus-within:ring-0"
              style={{ borderColor: searchFocused ? "rgba(17,17,17,0.20)" : "rgba(17,17,17,0.10)" }}
            >
              <input type="hidden" name="store" value={store.slug} />
              <m.span
                aria-hidden="true"
                animate={searchFocused && !reducedMotion ? { rotate: [0, -8, 8, -4, 0] } : { rotate: 0 }}
                transition={{ duration: 0.38, ease: "easeInOut" }}
                className="flex shrink-0 items-center text-black/40"
              >
                <Search size={17} />
              </m.span>

              <input
                type="search"
                name="search"
                value={searchQuery}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchQuery(nextValue);
                  setSearchLoading(nextValue.trim().length >= 2);
                  if (nextValue.trim().length < 2) setSearchResults([]);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchFocused(false);
                }}
                placeholder="Search products..."
                aria-label="Search products"
                aria-controls="header-search-results"
                autoComplete="off"
                className="header-product-search-input ml-0 min-w-0 flex-1 !border-0 bg-transparent text-sm text-[#292B25] !outline-none !ring-0 placeholder:text-black/35 focus:!border-0 focus:!outline-none focus:!ring-0 focus-visible:!border-0 focus-visible:!outline-none focus-visible:!ring-0"
                style={{ border: "none", outline: "none", boxShadow: "none" }}
              />

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearchLoading(false);
                  setSearchFocused(true);
                }}
                disabled={!searchQuery}
                aria-label="Reset product search"
                className="shrink-0 text-xs font-semibold transition-opacity hover:opacity-70 disabled:cursor-default disabled:opacity-40"
                style={{ color: store.primaryColor }}
              >
                Reset
              </button>
            </form>

            {showSearchDropdown && (
              <div
                id="header-search-results"
                role="region"
                aria-label="Product search suggestions"
                className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-2xl border border-black/8 bg-white p-2 shadow-[0_18px_55px_rgba(0,0,0,0.14)]"
              >
                {searchLoading ? (
                  <div className="px-4 py-6 text-center text-xs text-black/45">
                    Searching products...
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <p className="px-3 pb-2 pt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-black/40">
                      Products
                    </p>
                    {searchResults.slice(0, 5).map((product) => {
                      const productImage = product.images[0];
                      const imageSrc = normalizeImageUrl(productImage?.imageUrl);

                      return (
                        <Link
                          key={product.id}
                          href={`/product/${encodeURIComponent(product.slug)}?store=${encodeURIComponent(store.slug)}`}
                          onClick={() => {
                            setSearchFocused(false);
                            setSearchQuery("");
                          }}
                          className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-[#F7F4ED]"
                        >
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-[#F7F4ED]">
                            {imageSrc ? (
                              <Image
                                src={imageSrc}
                                alt={productImage?.altText || product.name}
                                fill
                                sizes="48px"
                                unoptimized={isUnoptimizedUrl(imageSrc)}
                                className="object-contain p-1"
                              />
                            ) : (
                              <div className="grid h-full place-items-center text-black/25">
                                <ShoppingBag size={19} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-xs font-medium text-[#292B25] transition-colors group-hover:text-black">
                              {product.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold" style={{ color: store.primaryColor }}>
                              {formatSearchPrice(product.price, store.currency)}
                            </p>
                            {!product.isAvailable && (
                              <p className="mt-0.5 text-[10px] text-black/40">Currently unavailable</p>
                            )}
                          </div>

                          <ArrowUpRight size={15} className="shrink-0 text-black/25 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        </Link>
                      );
                    })}
                    <Link
                      href={`/shop?store=${encodeURIComponent(store.slug)}&search=${encodeURIComponent(searchQuery.trim())}`}
                      onClick={() => setSearchFocused(false)}
                      className="mt-1 flex items-center justify-center rounded-xl px-3 py-3 text-xs font-semibold transition-colors hover:bg-black/5"
                      style={{ color: store.primaryColor }}
                    >
                      View all search results <ArrowRight size={14} className="ml-2" />
                    </Link>
                  </>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <Search size={20} className="mx-auto text-black/25" />
                    <p className="mt-2 text-xs font-medium text-[#292B25]">No products found</p>
                    <p className="mt-1 text-[11px] text-black/40">Try another product name.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account, wishlist and cart */}

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">

            <Link

  href="/account"

  aria-label="My account"

  className="group hidden items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2.5 text-xs font-medium text-[#292B25] transition-all duration-200 hover:border-black/20 hover:bg-[#F7F4ED] hover:shadow-sm sm:flex"

>

  <UserRound

    size={17}

    strokeWidth={1.7}

    className="transition-transform duration-200 group-hover:scale-105"

  />

  <span>Account</span>

</Link>

            <Link

  href="/wishlist"

  aria-label="Wishlist"

  title="Wishlist"

  className="group grid size-10 place-items-center rounded-full border border-black/10 bg-white text-[#292B25] transition-all duration-200 hover:border-[#d71920]/35 hover:text-[#d71920] hover:shadow-sm active:scale-95"

>

  <Heart

    size={20}

    strokeWidth={1.7}

    className="transition-transform duration-200 group-hover:scale-110"

  />

</Link>

            <Link

              href="/cart"

              aria-label="Shopping cart"

              className="grid size-10 place-items-center rounded-full text-white transition-opacity hover:opacity-80"

              style={{ backgroundColor: store.primaryColor }}

            >

              <ShoppingBag size={18} strokeWidth={1.7} />

            </Link>

          </div>

        </div>

        {/* Mobile search */}

        <form

          action="/shop"

          method="get"

          role="search"

          className="px-4 pb-3 md:hidden"

        >

          <input type="hidden" name="store" value={store.slug} />

          <div className="flex items-center rounded-full border border-black/10 bg-white px-4 py-3">

            <Search

              size={16}

              aria-hidden="true"

              className="shrink-0 text-black/35"

            />

            <input

              type="search"

              name="search"

              placeholder="Search kitchen essentials..."

              aria-label="Search products"

              className="ml-3 min-w-0 flex-1 bg-transparent text-xs outline-none"

            />

          </div>

        </form>

        {/* Black navigation bar */}

        <nav

          aria-label="Main navigation"

          className="border-t border-white/10 bg-[#111111] text-white"

        >

          <div className="mx-auto flex max-w-[1440px] items-center gap-6 overflow-x-auto px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] sm:px-7 lg:gap-7 lg:px-12">

            <Link

              href="/shop"

              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-[#ff4148]"

            >

              <Menu size={15} />

              Shop all

            </Link>

            <Link

              href="/"

              className="shrink-0 whitespace-nowrap text-white transition-colors hover:text-[#ff4148]"

            >

              Home

            </Link>

            <Link

              href="/shop"

              className="shrink-0 whitespace-nowrap text-white/65 transition-colors hover:text-white"

            >

              New arrivals

            </Link>

            {categories.slice(0, 5).map((category) => (

              <Link

                key={category.id}

                href={`/shop?category=${encodeURIComponent(category.slug)}`}

                className="shrink-0 whitespace-nowrap text-white/65 transition-colors hover:text-white"

              >

                {category.name}

              </Link>

            ))}

            {hasSpecialOffers && (

              <Link

                href="/shop"

                className="shrink-0 whitespace-nowrap font-bold"

                style={{ color: store.accentColor }}

              >

                Special offers

              </Link>

            )}

          </div>

        </nav>

      </m.header>

      {/* Full-width hero banner */}

      <m.section

        initial={reducedMotion ? false : { y: 34, opacity: 0 }}

        animate={{ y: 0, opacity: 1 }}

        transition={{

          duration: reducedMotion ? 0 : 1.35,

          delay: reducedMotion ? 0 : 0.12,

          ease: smoothEase,

        }}

        aria-label="Featured collections"

        className="px-3 pt-4 sm:px-6 sm:pt-6 lg:px-10"

      >

        <div

          className="relative isolate mx-auto min-h-[390px] max-w-[1440px] overflow-visible rounded-[24px] bg-[#181818] shadow-[0_18px_55px_rgba(0,0,0,0.12)] sm:min-h-[430px] sm:rounded-[30px] lg:min-h-[455px]"

          style={{ backgroundColor: store.surfaceColor }}

        >

          {/* Full-bleed slide images */}

          <div className="absolute inset-0 z-0">

            <AnimatePresence initial={false}>

              {imageIndices.map((index) => {

                const slide = slides[index];

                const isDisplayed = index === currentIndex;

                const slideImage = slide.imageUrl;

                return (

                  <m.div

                    key={slide.id}

                    initial={false}

                    animate={{ opacity: isDisplayed ? 1 : 0 }}

                    exit={{ opacity: 0 }}

                    transition={{

                      duration: transitionDuration,

                      ease: smoothEase,

                    }}

                    aria-hidden={!isDisplayed}

                    className="absolute inset-0 overflow-hidden rounded-[24px] sm:rounded-[30px]"

                    style={{ zIndex: isDisplayed ? 1 : 0 }}

                  >

                    {slideImage ? (

                      <Image

                        src={slideImage}

                        alt={

                          slide.title ||

                          `${store.displayName} kitchenware collection`

                        }

                        fill

                        sizes="100vw"

                        preload={index === 0}

                        unoptimized={isUnoptimizedUrl(slideImage)}

                        onLoad={() => handleSlideImageLoaded(index)}

                        onError={() => handleSlideImageLoaded(index)}

                        className="object-cover object-[60%_center]"

                      />

                    ) : (

                      <div

                        className="absolute inset-0"

                        style={{

                          background: `linear-gradient(135deg, ${store.surfaceColor}, ${store.primaryColor}80)`,

                        }}

                      />

                    )}

                    {/* Darken the text side for readability */}

                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/15 sm:from-black/80 sm:via-black/45 sm:to-transparent" />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

                  </m.div>

                );

              })}

            </AnimatePresence>

          </div>

          {/* Text overlay */}

          <div className="relative z-10 flex min-h-[390px] items-center px-6 py-8 sm:min-h-[430px] sm:px-10 sm:py-10 lg:min-h-[455px] lg:px-16 xl:px-20">

            <div className="w-full max-w-[620px] pb-5 sm:pb-8">

              <div className="mb-5 inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/25 bg-black/25 px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/90 shadow-sm backdrop-blur-md sm:mb-6 sm:text-[10px]">

                <span

                  className="size-1.5 shrink-0 rounded-full"

                  style={{ backgroundColor: store.accentColor }}

                />

                <span className="truncate">

                  {currentSlide.eyebrow || "THE ART OF EVERYDAY COOKING"}

                </span>

              </div>

              <div className="grid w-full">

                <AnimatePresence initial={false}>

                  <m.div

                    key={currentSlide.id}

                    initial={reducedMotion ? false : { y: 10, opacity: 0 }}

                    animate={{ y: 0, opacity: 1 }}

                    exit={reducedMotion ? undefined : { y: -6, opacity: 0 }}

                    transition={{

                      duration: transitionDuration,

                      ease: smoothEase,

                    }}

                    className="col-start-1 row-start-1 w-full"

                  >

                    <h1 className="max-w-[620px] text-[42px] font-semibold leading-[1.03] tracking-[-0.045em] text-white sm:text-6xl lg:text-[70px]">

                      <span className="block [overflow-wrap:anywhere]">

                        {currentSlide.title || "Make room for"}

                      </span>

                      <span

                        className="mt-2 block [overflow-wrap:anywhere]"

                        style={{

                          color: store.accentColor || store.primaryColor,

                        }}

                      >

                        {currentSlide.accentText || "better moments."}

                      </span>

                    </h1>

                    <p className="mt-5 max-w-[465px] text-sm leading-7 text-white/80 sm:mt-6 sm:text-base sm:leading-8">

                      {currentSlide.description ||

                        store.tagline ||

                        "Thoughtfully chosen cookware, utensils and everyday essentials for a kitchen that feels like home."}

                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-8">

                      <Link

                        href={safeHref(currentSlide.buttonUrl)}

                        className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full px-6 py-3.5 text-xs font-bold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"

                        style={{ backgroundColor: store.primaryColor }}

                      >

                        {currentSlide.buttonText || "Explore the collection"}

                        <ArrowRight

                          size={15}

                          className="transition-transform group-hover:translate-x-1"

                        />

                      </Link>

                      <Link

                        href="/shop"

                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/45 bg-white/5 px-5 py-3.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"

                      >

                        Shop all

                        <ArrowUpRight size={14} />

                      </Link>

                    </div>

                  </m.div>

                </AnimatePresence>

              </div>

              {slides.length > 1 && (

                <div

                  className="mt-8 flex items-center gap-2.5"

                  role="group"

                  aria-label="Choose hero banner"

                >

                  {slides.map((slide, index) => (

                    <m.button

                      key={slide.id}

                      type="button"

                      aria-label={`Show banner ${index + 1}`}

                      aria-pressed={currentIndex === index}

                      onClick={() => goToSlide(index)}

                      whileTap={

                        reducedMotion ? undefined : { scale: 0.92 }

                      }

                      className="h-1.5 rounded-full"

                      animate={{

                        width: currentIndex === index ? 30 : 7,

                        backgroundColor:

                          currentIndex === index

                            ? store.accentColor

                            : "rgba(255,255,255,0.55)",

                      }}

                      transition={{

                        duration: transitionDuration,

                        ease: smoothEase,

                      }}

                    />

                  ))}

                </div>

              )}

            </div>

          </div>

          {/* Round offer badge */}

          {/* Premium overlapping sale burst badge */}

{(currentSlide.offerPercent ?? store.heroOfferPercent) > 0 && (
  <AnimatePresence initial={false}>
    <m.div
      key={`offer-${currentSlide.id}`}
      initial={
        reducedMotion
          ? false
          : {
              y: -45,
              scale: 0.7,
              rotate: 20,
              opacity: 0,
            }
      }
      animate={{
        y: 0,
        scale: 1,
        rotate: 8,
        opacity: 1,
      }}
      exit={
        reducedMotion
          ? undefined
          : {
              y: -20,
              scale: 0.85,
              opacity: 0,
            }
      }
      transition={{
        duration: reducedMotion ? 0 : 0.9,
        delay: reducedMotion ? 0 : 0.3,
        ease: smoothEase,
      }}
      className="absolute -right-4 -top-5 z-30 h-[122px] w-[122px] sm:-right-5 sm:-top-7 sm:h-[148px] sm:w-[148px]"
      style={{
        clipPath:
          "polygon(50% 0%, 59% 8%, 72% 3%, 79% 14%, 92% 16%, 91% 29%, 100% 38%, 93% 50%, 100% 62%, 91% 71%, 92% 84%, 79% 86%, 72% 97%, 59% 92%, 50% 100%, 41% 92%, 28% 97%, 21% 86%, 8% 84%, 9% 71%, 0% 62%, 7% 50%, 0% 38%, 9% 29%, 8% 16%, 21% 14%, 28% 3%, 41% 8%)",
        backgroundColor: store.accentColor || "#F5C542",
        filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.25))",
      }}
      aria-label={`${currentSlide.offerPercent ?? store.heroOfferPercent}% discount`}
    >
      <div
        className="absolute inset-[4px] grid place-items-center text-center text-white"
        style={{
          clipPath:
            "polygon(50% 0%, 59% 8%, 72% 3%, 79% 14%, 92% 16%, 91% 29%, 100% 38%, 93% 50%, 100% 62%, 91% 71%, 92% 84%, 79% 86%, 72% 97%, 59% 92%, 50% 100%, 41% 92%, 28% 97%, 21% 86%, 8% 84%, 9% 71%, 0% 62%, 7% 50%, 0% 38%, 9% 29%, 8% 16%, 21% 14%, 28% 3%, 41% 8%)",
          backgroundColor: store.primaryColor,
        }}
      >
        <div className="-rotate-[8deg]">
          <span className="block text-[8px] font-bold uppercase tracking-[0.2em] text-white/85 sm:text-[9px]">
            Special offer
          </span>

          <span className="mt-0.5 block text-[34px] font-black leading-none tracking-[-0.06em] sm:text-[43px]">
            {currentSlide.offerPercent ?? store.heroOfferPercent}%
          </span>

          <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#F5C542] sm:text-xs">
            OFF
          </span>

          <span className="mt-1 block text-[7px] font-semibold uppercase tracking-[0.12em] text-white/65">
            Don&apos;t miss it
          </span>
        </div>
      </div>
    </m.div>
  </AnimatePresence>
)}

          {/* Carousel arrows */}

          {slides.length > 1 && (

            <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 sm:right-5 sm:flex-row">

              <m.button

                type="button"

                aria-label="Previous banner"

                onClick={() => moveSlide(-1)}

                whileHover={reducedMotion ? undefined : { scale: 1.05 }}

                whileTap={reducedMotion ? undefined : { scale: 0.95 }}

                className="grid size-9 place-items-center rounded-full border border-white/35 bg-black/25 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/45 sm:size-11"

              >

                <ChevronLeft size={19} />

              </m.button>

              <m.button

                type="button"

                aria-label="Next banner"

                onClick={() => moveSlide(1)}

                whileHover={reducedMotion ? undefined : { scale: 1.05 }}

                whileTap={reducedMotion ? undefined : { scale: 0.95 }}

                className="grid size-9 place-items-center rounded-full border border-white/35 bg-black/25 text-white shadow-md backdrop-blur-md transition-colors hover:bg-black/45 sm:size-11"

              >

                <ChevronRight size={19} />

              </m.button>

            </div>

          )}

        </div>

      </m.section>

    </LazyMotion>

  );

}
