import HomeHeaderHero from "./HomeHeaderHero";
import Image from "next/image";
import Link from "next/link";
import AnimatedCategoryCards from "./AnimatedCategoryCards";

import {

  ArrowRight,

  ArrowUpRight,

  ChevronRight,

  Clock3,

  Headphones,

  Heart,

  Mail,

  ShieldCheck,

  ShoppingBag,

  Truck,

} from "lucide-react";

type ProductImage = {

  id: number;

  imageUrl: string;

  altText: string | null;

  isPrimary: boolean;

  sortOrder: number;

};

type Product = {

  id: number;

  name: string;

  slug: string;

  price: string;

  compareAtPrice: string | null;

  shortDescription: string | null;

  isFeatured: boolean;

  isAvailable: boolean;

  createdAt: string;

  category: {

    id: number;

    name: string;

    slug: string;

  } | null;

  images: ProductImage[];

};

type Category = {

  id: number;

  name: string;

  slug: string;

  description: string | null;

  imageUrl: string | null;

  fallbackImageUrl: string | null;

};

type HeroSlide = {

  id: number;

  imageUrl: string;

  eyebrow: string | null;

  title: string | null;

  accentText: string | null;

  description: string | null;

  buttonText: string | null;

  buttonUrl: string | null;

  offerPercent: number | null;

};

type StoreInfo = {

  slug: string;
  facebookUrl: string | null;
instagramUrl: string | null;
tiktokUrl: string | null;

  name: string;

  displayName: string;

  tagline: string;

  description: string;

  aboutText: string | null;

  logoUrl: string | null;

  phone: string | null;

  whatsapp: string | null;

  email: string | null;

  currency: string;

  primaryColor: string;

  secondaryColor: string;

  accentColor: string;

  backgroundColor: string;

  surfaceColor: string;

  textColor: string;

  mutedColor: string;

  heroOfferPercent: number;

  announcementMessages?: string[];

};

type HomeClientProps = {

  store: StoreInfo;

  categories: Category[];

  products: Product[];

  heroSlides: HeroSlide[];

};

function imageUrl(value: string | null | undefined) {
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

function productImage(product: Product) {

  const image =

    product.images.find((item) => item.isPrimary) ??

    product.images[0];

  return {

    src: imageUrl(image?.imageUrl),

    alt: image?.altText || product.name,

  };

}

function formatPrice(value: string | number, currency: string) {

  const amount = Number(value);

  if (!Number.isFinite(amount)) return `${currency} 0.00`;

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

function discountPercent(product: Product) {

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

function categoryLink(slug: string) {

  return `/shop?category=${encodeURIComponent(slug)}`;

}

function StoreImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  if (!src) {
    return (
      <div
        className={`grid place-items-center ${className}`}
        aria-label="Product image unavailable"
      >
        <ShoppingBag className="h-8 w-8 text-black/20" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={1200}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      unoptimized={/^(https?:\/\/|data:|blob:)/i.test(src)}
      className={className}
      loading="lazy"
    />
  );
}

function ProductCard({

  product,

  currency,

  primaryColor,

  surfaceColor,

  mutedColor,

}: {

  product: Product;

  currency: string;

  primaryColor: string;

  surfaceColor: string;

  mutedColor: string;

}) {

  const image = productImage(product);

  const discount = discountPercent(product);

  return (

    <article className="group min-w-0">

      <Link

        href={`/product/${encodeURIComponent(product.slug)}`}

        className="block"

      >

        <div

          className="relative aspect-[4/5] overflow-hidden rounded-2xl"

          style={{ backgroundColor: surfaceColor }}

        >

          <StoreImage

            src={image.src}

            alt={image.alt}

            className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-[1.045] sm:p-7"

          />

          {discount > 0 && (

            <span

              className="absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-semibold text-white"

              style={{ backgroundColor: primaryColor }}

            >

              Save {discount}%

            </span>

          )}

          {!product.isAvailable && (

            <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-black/60 shadow-sm">

              Currently unavailable

            </span>

          )}

          <span

            className="absolute bottom-3 right-3 grid size-10 translate-y-2 place-items-center rounded-full bg-white text-black opacity-0 shadow-md transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"

            aria-hidden="true"

          >

            <ArrowUpRight size={17} />

          </span>

        </div>

      </Link>

      <div className="pt-3">

        <p

          className="text-[10px] font-medium uppercase tracking-[0.14em]"

          style={{ color: mutedColor }}

        >

          {product.category?.name ?? "Kitchen essentials"}

        </p>

        <Link href={`/product/${encodeURIComponent(product.slug)}`}>

          <h3 className="mt-1.5 line-clamp-2 min-h-10 text-sm font-medium leading-5 text-[#292B25] transition group-hover:text-[#65734D]">

            {product.name}

          </h3>

        </Link>

        <div className="mt-2 flex flex-wrap items-baseline gap-2">

          <span className="text-sm font-semibold text-[#292B25]">

            {formatPrice(product.price, currency)}

          </span>

          {discount > 0 && product.compareAtPrice && (

            <span className="text-xs text-black/35 line-through">

              {formatPrice(product.compareAtPrice, currency)}

            </span>

          )}

        </div>

      </div>

    </article>

  );

}

export default function HomeClient({

  store,

  categories,

  products,

  heroSlides,

}: HomeClientProps) {

  const primaryColor = store.primaryColor;
const surfaceColor = store.surfaceColor;
const mutedColor = store.mutedColor;

  const fallbackHeroImage = products[0]

  ? productImage(products[0]).src

  : "";

  const featuredProducts = products.filter(

    (product) => product.isFeatured,

  );

  const displayProducts = (

    featuredProducts.length > 0 ? featuredProducts : products

  ).slice(0, 8);

  const dealProducts = products.filter(

    (product) => discountPercent(product) > 0,

  );

  const collectionProducts = products.slice(0, 4);

  const whatsappHref = store.whatsapp

    ? `https://wa.me/${store.whatsapp.replace(/\D/g, "")}`

    : null;

  return (

    <main

      className="min-h-screen"

      style={{

        backgroundColor: store.backgroundColor,

        color: store.textColor,

      }}

    >

      <HomeHeaderHero
        store={store}
        categories={categories}
        heroSlides={heroSlides}
        fallbackImage={fallbackHeroImage}
        hasSpecialOffers={dealProducts.length > 0}
      />

      {/* Benefits */}

      <AnimatedCategoryCards
  categories={categories.slice(0, 4).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: imageUrl(
      category.imageUrl || category.fallbackImageUrl,
    ),
  }))}
  primaryColor={primaryColor}
/>

      {/* Categories */}

      {categories.length > 4 && (

        <section className="py-10 sm:py-14">

          <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-12">

            <div className="mb-7 flex items-end justify-between gap-4 sm:mb-9">

              <div>

                <p

                  className="text-[10px] font-semibold uppercase tracking-[0.2em]"

                  style={{ color: primaryColor }}

                >

                  More to explore

                </p>

                <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#292B25] sm:text-3xl">

                  More collections

                </h2>

              </div>

              <Link

                href="/shop"

                className="inline-flex shrink-0 items-center gap-2 text-xs font-medium"

                style={{ color: primaryColor }}

              >

                View all

                <ChevronRight size={15} />

              </Link>

            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">

              {categories.slice(4, 8).map((category, index) => {

                const src = imageUrl(

                  category.imageUrl || category.fallbackImageUrl,

                );

                return (

                  <Link

                    key={category.id}

                    href={categoryLink(category.slug)}

                    className="group relative overflow-hidden rounded-2xl sm:rounded-3xl"

                    style={{ backgroundColor: surfaceColor }}

                  >

                    <div className="relative aspect-[4/3] overflow-hidden">

                      {src ? (

                        <StoreImage

                          src={src}

                          alt={category.name}

                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"

                        />

                      ) : (

                        <div

                          className="grid h-full place-items-center"

                          style={{

                            background: `linear-gradient(135deg, ${surfaceColor}, ${primaryColor}18)`,

                          }}

                        >

                          <ShoppingBag

                            size={30}

                            strokeWidth={1.1}

                            className="text-black/25"

                          />

                        </div>

                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white sm:bottom-5 sm:left-5 sm:right-5">

                        <div>

                          <span className="block text-[9px] uppercase tracking-[0.12em] text-white/70">

                            Collection {String(index + 1).padStart(2, "0")}

                          </span>

                          <h3 className="mt-1 text-sm font-medium sm:text-base">

                            {category.name}

                          </h3>

                        </div>

                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-white group-hover:text-[#292B25]">

                          <ArrowUpRight size={15} />

                        </span>

                      </div>

                    </div>

                  </Link>

                );

              })}

            </div>

          </div>

        </section>

      )}

      {/* Featured products */}

      <section className="bg-white py-12 sm:py-16">

        <div className="mx-auto max-w-[1440px] px-4 sm:px-7 lg:px-12">

          <div className="mb-8 flex items-end justify-between gap-4 sm:mb-10">

            <div>

              <p

                className="text-[10px] font-semibold uppercase tracking-[0.2em]"

                style={{ color: primaryColor }}

              >

                Selected for your home

              </p>

              <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em] text-[#292B25] sm:text-3xl">

                {featuredProducts.length > 0

                  ? "Featured favourites"

                  : "Explore our products"}

              </h2>

              <p className="mt-2 max-w-lg text-xs leading-5 text-[#77776D] sm:text-sm">

                Discover practical essentials to make everyday cooking and

                kitchen life feel a little more special.

              </p>

            </div>

            <Link

              href="/shop"

              className="inline-flex shrink-0 items-center gap-2 text-xs font-medium"

              style={{ color: primaryColor }}

            >

              Shop all

              <ArrowRight size={15} />

            </Link>

          </div>

          {displayProducts.length > 0 ? (

            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-7">

              {displayProducts.map((product) => (

                <ProductCard

                  key={product.id}

                  product={product}

                  currency={store.currency}

                  primaryColor={primaryColor}

                  surfaceColor={surfaceColor}

                  mutedColor={mutedColor}

                />

              ))}

            </div>

          ) : (

            <div

              className="rounded-3xl px-5 py-16 text-center"

              style={{ backgroundColor: surfaceColor }}

            >

              <ShoppingBag

                size={30}

                strokeWidth={1.2}

                className="mx-auto text-black/30"

              />

              <h3 className="mt-4 text-lg font-medium text-[#292B25]">

                Our collection is being prepared

              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#77776D]">

                Please check back soon to explore our kitchenware and home

                essentials.

              </p>

            </div>

          )}

        </div>

      </section>

      {/* Editorial collection banner */}

      {collectionProducts.length > 0 && (

        <section className="px-4 py-12 sm:px-7 sm:py-16 lg:px-12">

          <div

            className="mx-auto grid max-w-[1440px] overflow-hidden rounded-3xl sm:grid-cols-2"

            style={{ backgroundColor: surfaceColor }}

          >

            <div className="flex flex-col items-start justify-center px-6 py-10 sm:px-10 sm:py-14 lg:px-14">

              <p

                className="text-[10px] font-semibold uppercase tracking-[0.2em]"

                style={{ color: primaryColor }}

              >

                Everyday, elevated

              </p>

              <h2 className="mt-3 max-w-md text-3xl font-medium leading-tight tracking-[-0.04em] text-[#292B25] sm:text-4xl">

                The little things that make a kitchen feel like yours.

              </h2>

              <p className="mt-4 max-w-md text-sm leading-7 text-[#77776D]">

                Explore practical pieces chosen for everyday meals, shared

                moments and the routines that bring us together.

              </p>

              <Link

                href="/shop"

                className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-semibold text-white"

                style={{ backgroundColor: primaryColor }}

              >

                Discover the collection

                <ArrowRight size={15} />

              </Link>

            </div>

            <div className="grid grid-cols-2 gap-2 p-3 sm:p-4">

              {collectionProducts.slice(0, 4).map((product) => {

                const image = productImage(product);

                return (

                  <Link

                    key={product.id}

                    href={`/product/${encodeURIComponent(product.slug)}`}

                    className="group overflow-hidden rounded-2xl bg-white"

                  >

                    <div className="aspect-square overflow-hidden">

                      <StoreImage

                        src={image.src}

                        alt={image.alt}

                        className="h-full w-full object-contain p-4 transition duration-500 group-hover:scale-105 sm:p-6"

                      />

                    </div>

                    <div className="px-3 pb-3">

                      <p className="line-clamp-1 text-xs font-medium text-[#292B25]">

                        {product.name}

                      </p>

                      <p className="mt-1 text-[11px] text-[#77776D]">

                        {formatPrice(product.price, store.currency)}

                      </p>

                    </div>

                  </Link>

                );

              })}

            </div>

          </div>

        </section>

      )}

      {/* About */}

      <section id="about" className="px-4 py-10 sm:px-7 sm:py-14 lg:px-12">

        <div className="mx-auto max-w-3xl text-center">

          <p

            className="text-[10px] font-semibold uppercase tracking-[0.2em]"

            style={{ color: primaryColor }}

          >

            Welcome to {store.displayName}

          </p>

          <h2 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-[#292B25] sm:text-3xl">

            A little more joy in your everyday kitchen.

          </h2>

          <p className="mt-4 text-sm leading-7 text-[#77776D]">

            {store.aboutText || store.description}

          </p>

          <Link

            href="/shop"

            className="mt-6 inline-flex items-center gap-2 text-xs font-semibold"

            style={{ color: primaryColor }}

          >

            Get to know our collection

            <ArrowRight size={15} />

          </Link>

        </div>

      </section>

      {/* Footer */}

      <footer

        id="contact"

        className="mt-6 text-white"

        style={{ backgroundColor: store.secondaryColor }}

      >

        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12 lg:py-16">

          <div>

            <Link href="/" className="inline-flex items-center gap-3">

              {store.logoUrl ? (

                <StoreImage

                  src={imageUrl(store.logoUrl)}

                  alt={`${store.displayName} logo`}

                  className="h-10 w-10 shrink-0 rounded-full border border-white/15 bg-white object-contain p-1"

                />

              ) : (

                <span

                  className="grid size-10 place-items-center rounded-full text-sm font-semibold text-white"

                  style={{ backgroundColor: primaryColor }}

                >

                  {store.displayName.charAt(0).toUpperCase()}

                </span>

              )}

              <span className="text-sm font-semibold tracking-[0.12em]">

                {store.displayName.toUpperCase()}

              </span>

            </Link>

            <p className="mt-4 max-w-xs text-xs leading-6 text-white/55">

              {store.tagline}

            </p>

          </div>

          <div>

            <h3 className="text-xs font-semibold uppercase tracking-[0.15em]">

              Explore

            </h3>

            <div className="mt-4 space-y-3 text-xs text-white/60">

              <Link href="/shop" className="block hover:text-white">

                Shop all products

              </Link>

              <Link href="/wishlist" className="block hover:text-white">

                Wishlist

              </Link>

              <Link href="/cart" className="block hover:text-white">

                Shopping cart

              </Link>

              <Link href="/account" className="block hover:text-white">

                My account

              </Link>

            </div>

          </div>

          <div>

            <h3 className="text-xs font-semibold uppercase tracking-[0.15em]">

              Customer care

            </h3>

            <div className="mt-4 space-y-3 text-xs text-white/60">

              <Link href="/track-order" className="block hover:text-white">

                Track your order

              </Link>

              <Link href="/shipping" className="block hover:text-white">

                Shipping information

              </Link>

              <Link href="/returns" className="block hover:text-white">

                Returns & refunds

              </Link>

              <Link href="/faq" className="block hover:text-white">

                Frequently asked questions

              </Link>

            </div>

          </div>

          <div>

            <h3 className="text-xs font-semibold uppercase tracking-[0.15em]">

              Contact us

            </h3>

            <div className="mt-4 space-y-3 text-xs text-white/60">

              {store.phone && (

                <p className="flex items-center gap-2">

                  <Headphones size={14} />

                  {store.phone}

                </p>

              )}

              {store.email && (

                <a

                  href={`mailto:${store.email}`}

                  className="flex items-center gap-2 hover:text-white"

                >

                  <Mail size={14} />

                  {store.email}

                </a>

              )}

              {whatsappHref && (

                <a

                  href={whatsappHref}

                  target="_blank"

                  rel="noreferrer"

                  className="flex items-center gap-2 hover:text-white"

                >

                  <Headphones size={14} />

                  Chat on WhatsApp

                </a>

              )}

              <p className="flex items-center gap-2">

                <Clock3 size={14} />

                Online shopping, anytime

              </p>

              {categories.length > 0 && (

                <div className="flex flex-wrap gap-x-3 gap-y-2 pt-2">

                  {categories.slice(0, 5).map((category) => (

                    <Link

                      key={category.id}

                      href={categoryLink(category.slug)}

                      className="hover:text-white"

                    >

                      {category.name}

                    </Link>

                  ))}

                </div>

              )}

            </div>

          </div>

        </div>

        <div className="border-t border-white/10">

          <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-5 text-[10px] text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">

            <p>

              © {new Date().getFullYear()} {store.displayName}. All rights

              reserved.

            </p>

            <p>

              Prices displayed in {store.currency}. Secure shopping.

            </p>

          </div>

        </div>

      </footer>

    </main>

  );

}
