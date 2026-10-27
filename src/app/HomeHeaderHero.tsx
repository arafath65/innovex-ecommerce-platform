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
  Search,
  ShoppingBag,
} from "lucide-react";

type HeaderStore = {
  displayName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  heroOfferPercent: number;
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

export default function HomeHeaderHero({
  store,
  categories,
  heroSlides,
  fallbackImage,
  hasSpecialOffers,
}: HomeHeaderHeroProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [displayIndex, setDisplayIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [loadedSlideIds, setLoadedSlideIds] = useState<Set<number>>(
    () => new Set<number>(),
  );

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
  }, [heroSlides, fallbackSrc, store.tagline, store.heroOfferPercent]);

  // Keep the currently displayed image visible until the next image has
  // actually loaded. This avoids the blank frame/flash during a slide change.
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

    // Render just the requested next image behind the current one. Its load
    // event will trigger the crossfade after the image is ready.
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

  useEffect(() => {
    if (reducedMotion || slides.length < 2) return;

    // A generous dwell time makes the carousel feel calm rather than busy.
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
  }, [currentIndex, loadedSlideIds, reducedMotion, slides]);

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
      {/* Announcement strip */}
      <m.div
        initial={reducedMotion ? false : { y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.65, ease: smoothEase }}
        className="px-4 py-2.5 text-center text-[10px] font-semibold tracking-[0.12em] text-white sm:text-xs"
        style={{ backgroundColor: store.primaryColor }}
      >
        THOUGHTFULLY CHOSEN KITCHEN ESSENTIALS
        <span className="mx-2 opacity-60">•</span>
        A BETTER EVERYDAY KITCHEN
      </m.div>

      {/* Header */}
      <m.header
        initial={reducedMotion ? false : { y: -6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.7, delay: 0.08, ease: smoothEase }}
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
              <span className="block truncate text-xs font-bold tracking-[0.13em] text-[#111111] sm:text-sm">
                {store.displayName.toUpperCase()}
              </span>
              <span className="mt-1 hidden text-[9px] tracking-[0.12em] text-black/45 sm:block">
                KITCHEN & HOME
              </span>
            </span>
          </Link>

          {/* Desktop search */}
          <form
            action="/shop"
            method="get"
            role="search"
            className="mx-auto hidden max-w-[470px] flex-1 items-center rounded-full border border-black/10 bg-white px-4 py-2.5 md:flex"
          >
            <Search size={16} aria-hidden="true" className="shrink-0 text-black/35" />
            <input
              type="search"
              name="search"
              placeholder="Search kitchen essentials..."
              aria-label="Search products"
              className="ml-3 min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-black/35"
            />
            <button
              type="submit"
              className="text-xs font-semibold transition-colors hover:text-black"
              style={{ color: store.primaryColor }}
            >
              Search
            </button>
          </form>

          {/* Account, wishlist and cart */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
            <Link
              href="/account"
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs text-black/65 transition-colors hover:bg-black/5 hover:text-black sm:flex"
            >
              <span aria-hidden="true">♙</span>
              Account
            </Link>

            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="grid size-10 place-items-center rounded-full text-[#111111] transition-colors hover:bg-black/5"
            >
              <Heart size={19} strokeWidth={1.6} />
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
          <div className="flex items-center rounded-full border border-black/10 bg-white px-4 py-3">
            <Search size={16} aria-hidden="true" className="shrink-0 text-black/35" />
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

      {/* Full-width hero banner: image fills the complete container */}
      <m.section
        initial={reducedMotion ? false : { y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.8, delay: 0.14, ease: smoothEase }}
        aria-label="Featured collections"
        className="px-3 pt-4 sm:px-6 sm:pt-6 lg:px-10"
      >
        <div
          className="relative isolate mx-auto min-h-[500px] max-w-[1440px] overflow-hidden rounded-[24px] bg-[#181818] shadow-[0_18px_55px_rgba(0,0,0,0.12)] sm:min-h-[520px] sm:rounded-[30px] lg:min-h-[550px]"
          style={{ backgroundColor: store.surfaceColor }}
        >
          {/* Full-bleed slide images. Only the current and pending slide are mounted. */}
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
                    transition={{ duration: transitionDuration, ease: smoothEase }}
                    aria-hidden={!isDisplayed}
                    className="absolute inset-0"
                    style={{ zIndex: isDisplayed ? 1 : 0 }}
                  >
                    {slideImage ? (
                      <Image
                        src={slideImage}
                        alt={slide.title || `${store.displayName} kitchenware collection`}
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

                    {/* Darken the copy side while leaving the product visible on the right. */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/15 sm:from-black/80 sm:via-black/45 sm:to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
                  </m.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Text overlay */}
          <div className="relative z-10 flex min-h-[500px] items-center px-6 py-12 sm:min-h-[520px] sm:px-10 sm:py-14 lg:min-h-[550px] lg:px-16 xl:px-20">
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
                    transition={{ duration: transitionDuration, ease: smoothEase }}
                    className="col-start-1 row-start-1 w-full"
                  >
                    <h1 className="max-w-[620px] text-[42px] font-semibold leading-[1.03] tracking-[-0.045em] text-white sm:text-6xl lg:text-[70px]">
                      <span className="block [overflow-wrap:anywhere]">
                        {currentSlide.title || "Make room for"}
                      </span>
                      <span
                        className="mt-2 block [overflow-wrap:anywhere]"
                        style={{ color: store.accentColor || store.primaryColor }}
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
                      whileTap={reducedMotion ? undefined : { scale: 0.92 }}
                      className="h-1.5 rounded-full"
                      animate={{
                        width: currentIndex === index ? 30 : 7,
                        backgroundColor:
                          currentIndex === index ? store.accentColor : "rgba(255,255,255,0.55)",
                      }}
                      transition={{ duration: transitionDuration, ease: smoothEase }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Offer marker sits inside the image rather than competing with the headline. */}
          {(currentSlide.offerPercent ?? store.heroOfferPercent) > 0 && (
            <AnimatePresence initial={false}>
              <m.div
                key={`offer-${currentSlide.id}`}
                initial={reducedMotion ? false : { scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: transitionDuration, ease: smoothEase }}
                className="absolute bottom-5 right-5 z-20 grid size-[78px] place-items-center rounded-full border border-white/35 text-center text-white shadow-xl backdrop-blur-sm sm:bottom-7 sm:right-7 sm:size-[94px]"
                style={{ backgroundColor: store.primaryColor }}
              >
                <span>
                  <span className="block text-[8px] uppercase tracking-[0.14em] text-white/80">
                    Up to
                  </span>
                  <span className="block text-2xl font-semibold leading-7 sm:text-3xl">
                    {currentSlide.offerPercent ?? store.heroOfferPercent}%
                  </span>
                  <span className="block text-[8px] uppercase tracking-[0.16em]">
                    off
                  </span>
                </span>
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
