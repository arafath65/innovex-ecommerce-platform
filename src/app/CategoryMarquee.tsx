
"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

type CategoryMarqueeItem = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  productCount: number;
};

type CategoryMarqueeProps = {
  categories: CategoryMarqueeItem[];
  primaryColor: string;
};

function CategoryItem({
  category,
  index,
  duplicate = false,
}: {
  category: CategoryMarqueeItem;
  index: number;
  duplicate?: boolean;
}) {
  const content = (
    <>
      <span className="category-marquee-image">
        <Image
          src={category.imageUrl}
          alt={duplicate ? "" : category.name}
          width={112}
          height={112}
          unoptimized
          draggable={false}
          className="category-marquee-photo"
        />
      </span>

      <span className="category-marquee-name">
        {category.name}
      </span>

      <span className="category-marquee-count">
        {category.productCount.toLocaleString("en-LK")}{" "}
        {category.productCount === 1 ? "product" : "products"}
      </span>
    </>
  );

  const itemStyle = {
    "--category-delay": `${index * 0.48}s`,
  } as CSSProperties;

  if (duplicate) {
    return (
      <div
        className="category-marquee-item"
        style={itemStyle}
        aria-hidden="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/shop?category=${encodeURIComponent(category.slug)}`}
      className="category-marquee-item"
      style={itemStyle}
    >
      {content}
    </Link>
  );
}

export default function CategoryMarquee({
  categories,
  primaryColor,
}: CategoryMarqueeProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);

  const [shouldLoop, setShouldLoop] = useState(false);
  const [duration, setDuration] = useState(32);

  useEffect(() => {
    const viewport = viewportRef.current;
    const group = firstGroupRef.current;

    if (!viewport || !group) return;

    const measure = () => {
      const contentWidth = group.scrollWidth;
      const viewportWidth = viewport.clientWidth;
      const needsLoop = contentWidth > viewportWidth + 2;

      setShouldLoop((current) =>
        current === needsLoop ? current : needsLoop
      );

      setDuration(
        Math.max(24, Math.round(contentWidth / 34))
      );
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(viewport);
    observer.observe(group);

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [categories.length]);

  if (categories.length === 0) return null;

  return (
    <section className="category-marquee-section">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-12">

        <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-[0.2em]"
              style={{ color: primaryColor }}
            >
              Find your favourites
            </p>

            <h2 className="mt-1.5 text-2xl font-medium tracking-[-0.04em] text-[#292B25] sm:text-3xl">
              Shop by category
            </h2>
          </div>

          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center gap-1.5 pb-1 text-[11px] font-semibold transition-opacity hover:opacity-65"
            style={{ color: primaryColor }}
          >
            View all
            <span aria-hidden="true">›</span>
          </Link>
        </div>

        <div
          ref={viewportRef}
          className={`category-marquee-viewport ${
            shouldLoop ? "is-looping" : ""
          }`}
          style={
            {
              "--category-marquee-duration": `${duration}s`,
            } as CSSProperties
          }
        >
          <div
            className={`category-marquee-track ${
              shouldLoop ? "is-looping" : ""
            }`}
          >
            <div
              ref={firstGroupRef}
              className={`category-marquee-group ${
                shouldLoop ? "needs-loop" : "fits-container"
              }`}
            >
              {categories.map((category, index) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  index={index}
                />
              ))}
            </div>

            {shouldLoop ? (
              <div
                className="category-marquee-group duplicate-group"
                aria-hidden="true"
              >
                {categories.map((category, index) => (
                  <CategoryItem
                    key={`duplicate-${category.id}`}
                    category={category}
                    index={index}
                    duplicate
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Compact section spacing */

        .category-marquee-section {
          padding-top: 16px;
          padding-bottom: 16px;
        }

        .category-marquee-viewport {
          width: 100%;
          overflow: hidden;
        }

        .category-marquee-track {
          display: flex;
          width: 100%;
        }

        .category-marquee-group {
          display: flex;
          flex: 0 0 auto;
          align-items: flex-start;
          gap: 24px;
          width: max-content;
          padding-right: 24px;
        }

        .category-marquee-group.fits-container {
          margin-inline: auto;
          justify-content: center;
        }

        /* Individual category */

        .category-marquee-item {
          display: flex;
          flex: 0 0 116px;
          width: 116px;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: #292b25;
          text-decoration: none;

          animation: category-item-bob 3.6s ease-in-out infinite;
          animation-delay: var(--category-delay, 0s);

          will-change: transform;
        }

        /* Larger round image with padded border */

        .category-marquee-image {
          box-sizing: border-box;
          display: block;
          width: 108px;
          height: 108px;
          flex: 0 0 108px;
          overflow: hidden;

          padding: 6px;

          border: 2.5px solid rgba(41, 43, 37, 0.20);
          border-radius: 9999px;

          background: #fffdf9;

          box-shadow: 0 5px 16px rgba(0, 0, 0, 0.065);

          transition:
            box-shadow 250ms ease,
            border-color 250ms ease;
        }

        .category-marquee-photo {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  object-fit: contain;
  background: #ffffff;

  transition: transform 500ms ease;
}

        .category-marquee-item:hover .category-marquee-image {
          border-color: ${primaryColor};
          box-shadow: 0 9px 22px rgba(0, 0, 0, 0.12);
        }

        .category-marquee-item:hover .category-marquee-photo {
          transform: scale(1.08);
        }

        /* Category name */

        .category-marquee-name {
  display: -webkit-box;
  width: 100%;
  min-height: 22px;
  margin-top: 3px;
  overflow: hidden;
  color: #292b25;
  font-size: 11px;
  font-weight: 650;
  line-height: 12px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.category-marquee-count {
  margin-top: 0;
  color: #929087;
  font-size: 9px;
  line-height: 10px;
  white-space: nowrap;
}

        /* Continuous horizontal movement */

        .category-marquee-track.is-looping {
          width: max-content;
          animation:
            category-marquee-scroll
            var(--category-marquee-duration, 32s)
            linear infinite;

          will-change: transform;
        }

        .category-marquee-track.is-looping:hover {
          animation-play-state: paused;
        }

        .category-marquee-group.needs-loop {
          margin: 0;
        }

        /* Each circle moves up and returns independently */

        @keyframes category-item-bob {
          0%,
          12%,
          100% {
            transform: translateY(0);
          }

          20% {
            transform: translateY(-7px);
          }

          30% {
            transform: translateY(0);
          }
        }

        /* Row moves continuously right to left */

        @keyframes category-marquee-scroll {
          from {
            transform: translate3d(0, 0, 0);
          }

          to {
            transform: translate3d(-50%, 0, 0);
          }
        }

        /* Desktop */

        @media (min-width: 640px) {
          .category-marquee-group {
            gap: 30px;
            padding-right: 30px;
          }

          .category-marquee-item {
            flex-basis: 136px;
            width: 136px;
          }

          .category-marquee-image {
            width: 120px;
            height: 120px;
            flex-basis: 120px;
          }

          .category-marquee-name {
            font-size: 12px;
          }
        }

        /* Accessibility */

        @media (prefers-reduced-motion: reduce) {
          .category-marquee-viewport.is-looping {
            overflow-x: auto;
          }

          .category-marquee-track.is-looping {
            width: max-content;
            animation: none;
          }

          .category-marquee-group.duplicate-group {
            display: none;
          }

          .category-marquee-item {
            animation: none;
            will-change: auto;
          }
        }
      `}</style>
    </section>
  );
}
