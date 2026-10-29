import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import type { CSSProperties } from "react";

import styles from "./AnimatedCategoryCards.module.css";

type CategoryCardItem = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
};

type AnimatedCategoryCardsProps = {
  categories: CategoryCardItem[];
  primaryColor: string;
};

export default function AnimatedCategoryCards({
  categories,
  primaryColor,
}: AnimatedCategoryCardsProps) {
  const featuredCategories = categories.slice(0, 4);

  if (featuredCategories.length === 0) {
    return null;
  }

  return (
    <section className="py-9 sm:py-12">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-12">
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: primaryColor }}
            >
              Made for your home
            </p>

            <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#292B25] sm:text-3xl">
              Explore our collections
            </h2>

            <p className="mt-2 max-w-md text-xs leading-6 text-[#77776D] sm:text-sm">
              Discover thoughtful essentials for every corner of your kitchen.
            </p>
          </div>

          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center gap-1.5 pb-1 text-xs font-semibold transition-opacity hover:opacity-65"
            style={{ color: primaryColor }}
          >
            Shop all
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {featuredCategories.map((category, index) => {
            const delay = `${index * -1.15}s`;

            return (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className={`${styles.card} group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e5dc] shadow-sm sm:rounded-3xl`}
                style={
                  {
                    "--motion-delay": delay,
                    "--card-accent": primaryColor,
                  } as CSSProperties
                }
              >
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 45vw, 25vw"
                    unoptimized
                    className={styles.image}
                  />
                ) : (
                  <div
                    className="absolute inset-0 grid place-items-center"
                    style={{
                      background: `linear-gradient(145deg, #e9e5dc, ${primaryColor}30)`,
                    }}
                  >
                    <ShoppingBag
                      size={38}
                      strokeWidth={1}
                      className="text-black/30"
                    />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/80" />

                <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-black/25 px-2.5 py-1.5 text-[8px] font-semibold tracking-[0.16em] text-white backdrop-blur-md sm:left-4 sm:top-4 sm:px-3 sm:text-[9px]">
                  COLLECTION {String(index + 1).padStart(2, "0")}
                </span>

                <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white sm:p-5">
                  <h3 className="text-sm font-semibold leading-snug drop-shadow sm:text-lg">
                    {category.name}
                  </h3>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-medium tracking-wide text-white/80 sm:text-[10px]">
                      Explore collection
                    </span>

                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-full text-white transition-transform duration-300 group-hover:scale-110 sm:size-9"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </div>

                <span className={styles.shine} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}