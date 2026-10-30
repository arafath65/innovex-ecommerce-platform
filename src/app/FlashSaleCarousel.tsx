"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  ShoppingBag,
} from "lucide-react";

type FlashSaleProduct = {
  id: number;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
  images: {
    id: number;
    imageUrl: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }[];
};

type FlashSaleCarouselProps = {
  products: FlashSaleProduct[];
  currency: string;
  primaryColor: string;
  surfaceColor: string;
  mutedColor: string;
};

function normalizeImageUrl(value: string | null | undefined) {
  if (!value) return "";

  let url = value.trim().replace(/\\/g, "/");

  if (/^(https?:\/\/|data:|blob:)/i.test(url)) {
    return url;
  }

  url = url
    .replace(/^\.\//, "")
    .replace(/^\/?public\//i, "");

  return url.startsWith("/") ? url : `/${url}`;
}

function formatPrice(value: string, currency: string) {
  const amount = Number(value);

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
    return `${currency} ${amount.toLocaleString("en-LK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function getDiscount(product: FlashSaleProduct) {
  const price = Number(product.price);
  const oldPrice = Number(product.compareAtPrice);

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(oldPrice) ||
    oldPrice <= price
  ) {
    return 0;
  }

  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

function FlashSaleCard({
  product,
  currency,
  primaryColor,
  surfaceColor,
  mutedColor,
  duplicate = false,
}: {
  product: FlashSaleProduct;
  currency: string;
  primaryColor: string;
  surfaceColor: string;
  mutedColor: string;
  duplicate?: boolean;
}) {
  const image =
    product.images.find((item) => item.isPrimary) ??
    product.images[0];

  const src = normalizeImageUrl(image?.imageUrl);
  const discount = getDiscount(product);

  return (
    <article
      className="flash-sale-card group"
      aria-hidden={duplicate || undefined}
    >
      <Link
        href={`/product/${encodeURIComponent(product.slug)}`}
        tabIndex={duplicate ? -1 : undefined}
        className="block h-full"
      >
        <div
          className="relative aspect-square overflow-hidden rounded-[16px] border border-black/[0.055]"
          style={{ backgroundColor: surfaceColor }}
        >
          {src ? (
            <Image
              src={src}
              alt={duplicate ? "" : image?.altText || product.name}
              fill
              sizes="(max-width: 639px) 45vw, (max-width: 1023px) 24vw, 16vw"
              unoptimized
              loading="lazy"
              className="object-contain p-3 transition duration-500 group-hover:scale-105 sm:p-4"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <ShoppingBag
                size={30}
                strokeWidth={1.2}
                className="text-black/20"
              />
            </div>
          )}

          <span
            className="absolute left-2 top-2 rounded-md px-2 py-1 text-[9px] font-bold text-white shadow-sm sm:left-3 sm:top-3 sm:text-[10px]"
            style={{ backgroundColor: primaryColor }}
          >
            -{discount}%
          </span>

          <span className="absolute bottom-2 right-2 grid size-7 translate-y-1 place-items-center rounded-full bg-white text-black opacity-0 shadow-md transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:bottom-3 sm:right-3 sm:size-8">
            <ShoppingBag size={14} />
          </span>
        </div>

        <div className="pt-2.5">
          <p
            className="truncate text-[9px] font-medium uppercase tracking-[0.12em]"
            style={{ color: mutedColor }}
          >
            {product.category?.name ?? "Kitchen essentials"}
          </p>

          <h3 className="mt-1 line-clamp-2 min-h-9 text-[11px] font-semibold leading-[1.15rem] text-[#292B25] transition group-hover:text-[#d71920] sm:text-xs">
            {product.name}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs font-bold text-[#292B25] sm:text-sm">
              {formatPrice(product.price, currency)}
            </span>

            {product.compareAtPrice ? (
              <span className="text-[10px] text-black/35 line-through">
                {formatPrice(product.compareAtPrice, currency)}
              </span>
            ) : null}
          </div>

          <p
            className="mt-1 text-[9px] font-semibold"
            style={{ color: primaryColor }}
          >
            You save{" "}
            {formatPrice(
              (
                Number(product.compareAtPrice) -
                Number(product.price)
              ).toString(),
              currency,
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}

export default function FlashSaleCarousel({
  products,
  currency,
  primaryColor,
  surfaceColor,
  mutedColor,
}: FlashSaleCarouselProps) {
  const items = products.slice(0, 10);
  const shouldLoop = items.length > 6;

  const viewportRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);
  const groupWidthRef = useRef(0);
  const pausedRef = useRef(false);

  const measureCarousel = useCallback(() => {
    const group = firstGroupRef.current;

    if (!group) return;

    const firstCard = group.querySelector<HTMLElement>(
      ".flash-sale-card",
    );

    if (!firstCard) return;

    const styles = window.getComputedStyle(group);
    const gap = Number.parseFloat(styles.columnGap || "0");

    stepRef.current =
      firstCard.getBoundingClientRect().width + gap;

    groupWidthRef.current = group.scrollWidth;
  }, []);

  const moveCarousel = useCallback(
    (direction: -1 | 1) => {
      const viewport = viewportRef.current;

      if (!viewport || stepRef.current <= 0) return;

      if (direction === -1 && viewport.scrollLeft <= 1 && shouldLoop) {
        viewport.scrollLeft = groupWidthRef.current;
      }

      viewport.scrollBy({
        left: stepRef.current * direction,
        behavior: "smooth",
      });
    },
    [shouldLoop],
  );

  const handleCarouselScroll = useCallback(() => {
    const viewport = viewportRef.current;

    if (
      !shouldLoop ||
      !viewport ||
      groupWidthRef.current <= 0
    ) {
      return;
    }

    if (viewport.scrollLeft >= groupWidthRef.current) {
      viewport.scrollLeft -= groupWidthRef.current;
    }
  }, [shouldLoop]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = firstGroupRef.current;

    if (!viewport || !group) return;

    measureCarousel();

    const observer = new ResizeObserver(measureCarousel);
    observer.observe(viewport);
    observer.observe(group);

    window.addEventListener("resize", measureCarousel);

    let timer: number | undefined;

    if (shouldLoop) {
      timer = window.setInterval(() => {
        if (
          pausedRef.current ||
          document.visibilityState !== "visible"
        ) {
          return;
        }

        moveCarousel(1);
      }, 3200);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureCarousel);

      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    };
  }, [measureCarousel, moveCarousel, shouldLoop]);

  if (items.length === 0) return null;

  return (
    <section className="py-8 sm:py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-12">
        {/* Heading and controls */}
        <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="grid size-7 place-items-center rounded-lg text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <Flame size={15} fill="currentColor" />
              </span>

              <p
                className="text-[9px] font-bold uppercase tracking-[0.2em]"
                style={{ color: primaryColor }}
              >
                Deals you don&apos;t want to miss
              </p>
            </div>

            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#292B25] sm:text-3xl">
              Flash Sale
            </h2>

            <p className="mt-1 text-[11px] text-[#858176] sm:text-xs">
              Best-selling favourites at special prices.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => moveCarousel(-1)}
              disabled={items.length <= 1}
              aria-label="Previous flash sale products"
              className="grid size-8 place-items-center rounded-full border border-black/10 bg-white text-[#292B25] transition hover:border-[#d71920] hover:text-[#d71920] disabled:opacity-35 sm:size-9"
            >
              <ChevronLeft size={17} />
            </button>

            <button
              type="button"
              onClick={() => moveCarousel(1)}
              disabled={items.length <= 1}
              aria-label="Next flash sale products"
              className="grid size-8 place-items-center rounded-full border border-black/10 bg-white text-[#292B25] transition hover:border-[#d71920] hover:text-[#d71920] disabled:opacity-35 sm:size-9"
            >
              <ChevronRight size={17} />
            </button>

            <Link
              href="/shop"
              className="ml-1 inline-flex items-center gap-1 text-[10px] font-bold transition-opacity hover:opacity-65 sm:ml-2 sm:text-xs"
              style={{ color: primaryColor }}
            >
              View all
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Horizontal product carousel */}
        <div
          ref={viewportRef}
          className="flash-sale-viewport"
          onScroll={handleCarouselScroll}
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          onFocusCapture={() => {
            pausedRef.current = true;
          }}
          onBlurCapture={() => {
            pausedRef.current = false;
          }}
        >
          <div className="flash-sale-track">
            <div
              ref={firstGroupRef}
              className="flash-sale-group"
            >
              {items.map((product) => (
                <FlashSaleCard
                  key={product.id}
                  product={product}
                  currency={currency}
                  primaryColor={primaryColor}
                  surfaceColor={surfaceColor}
                  mutedColor={mutedColor}
                />
              ))}
            </div>

            {shouldLoop ? (
              <div
                className="flash-sale-group"
                aria-hidden="true"
              >
                {items.map((product) => (
                  <FlashSaleCard
                    key={`duplicate-${product.id}`}
                    product={product}
                    currency={currency}
                    primaryColor={primaryColor}
                    surfaceColor={surfaceColor}
                    mutedColor={mutedColor}
                    duplicate
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .flash-sale-viewport {
          container-type: inline-size;
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none;
          overscroll-behavior-x: contain;
        }

        .flash-sale-viewport::-webkit-scrollbar {
          display: none;
        }

        .flash-sale-track {
          display: flex;
          width: max-content;
          align-items: flex-start;
        }

        .flash-sale-group {
          display: flex;
          width: max-content;
          flex: 0 0 auto;
          align-items: flex-start;
          gap: 16px;
          padding-right: 16px;
        }

        .flash-sale-card {
          min-width: 0;
          flex: 0 0 calc((100cqi - 80px) / 6);
        }

        @media (min-width: 640px) and (max-width: 1023px) {
          .flash-sale-group {
            gap: 14px;
            padding-right: 14px;
          }

          .flash-sale-card {
            flex-basis: calc((100cqi - 42px) / 4);
          }
        }

        @media (max-width: 639px) {
          .flash-sale-group {
            gap: 12px;
            padding-right: 12px;
          }

          .flash-sale-card {
            flex-basis: calc((100cqi - 12px) / 2.15);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .flash-sale-viewport {
            scroll-behavior: auto;
          }
        }
      `}</style>
    </section>
  );
}