import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HomeClient from "./HomeClient";
import { resolveStorefrontForCurrentRequest } from "@/lib/storefront-domain";

export async function generateMetadata(): Promise<Metadata> {
  const resolution = await resolveStorefrontForCurrentRequest();

  if (resolution.kind === "platform") {
    return {
      title: "Innovex Web Solutions | Multi-store Ecommerce",
      description: "A multi-tenant ecommerce platform for independent online stores.",
    };
  }

  if (resolution.kind === "store") {
    const store = await prisma.store.findUnique({
      where: { id: resolution.storeId },
      select: {
        name: true,
        description: true,
        profile: { select: { displayName: true, tagline: true, description: true } },
      },
    });

    if (store) {
      const displayName = store.profile?.displayName?.trim() || store.name;
      return {
        title: displayName,
        description:
          store.profile?.tagline?.trim() ||
          store.profile?.description?.trim() ||
          store.description?.trim() ||
          `Shop online at ${displayName}.`,
      };
    }
  }

  return {
    title: "Storefront | Innovex Ecommerce",
    description: "This hostname is not connected to an active store.",
  };
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const resolution = await resolveStorefrontForCurrentRequest();

  if (resolution.kind === "platform") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#101612] px-6 text-white">
        <div className="max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-300">
            Innovex Web Solutions
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
            Multi-store ecommerce, built for growth.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
            The Innovex platform powers independent online stores with their own branding, products and domains.
          </p>
          <Link
            href="/super-admin/login"
            className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#101612] transition hover:bg-emerald-100"
          >
            Super Admin Login
          </Link>
        </div>
      </main>
    );
  }

  if (resolution.kind !== "store") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4ed] px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#65734d]">Innovex Storefront</p>
          <h1 className="mt-4 text-3xl font-semibold text-[#282a23]">Domain not connected</h1>
          <p className="mt-3 text-sm leading-6 text-[#77776d]">
            This hostname is not connected to an active store. Check the domain mapping in the Super Admin panel.
          </p>
        </div>
      </main>
    );
  }

  const store = await prisma.store.findFirst({
    where: {
      id: resolution.storeId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
      primaryColor: true,
      currency: true,
      heroOfferPercent: true,
      profile: {
        select: {
          businessName: true,
          displayName: true,
          tagline: true,
          description: true,
          logoUrl: true,
          phone: true,
          whatsapp: true,
          email: true,
          facebookUrl: true,
          instagramUrl: true,
          tiktokUrl: true,
          aboutText: true,
        },
      },
      settings: {
        select: {
          currency: true,
          announcementMessage1: true,
          announcementMessage2: true,
          announcementMessage3: true,
        },
      },
      theme: {
        select: {
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          backgroundColor: true,
          surfaceColor: true,
          textColor: true,
          mutedColor: true,
        },
      },
      heroSlides: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 3,
        select: {
          id: true,
          imageUrl: true,
          eyebrow: true,
          title: true,
          accentText: true,
          description: true,
          buttonText: true,
          buttonUrl: true,
          offerPercent: true,
        },
      },
    },
  });

  if (!store) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4ed] px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#65734d]">
            Kitchenware & Home Essentials
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-[#282a23]">
            Store unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#77776d]">
            This storefront is not available. Please check the store
            configuration and try again.
          </p>
        </div>
      </main>
    );
  }

  const announcementMessages = [
    store.settings?.announcementMessage1,
    store.settings?.announcementMessage2,
    store.settings?.announcementMessage3,
  ].filter((message): message is string => Boolean(message?.trim()));

  const [categories, rawProducts] = await Promise.all([
    prisma.category.findMany({
      where: {
        storeId: store.id,
        parentId: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        _count: {
          select: {
            products: {
              where: {
                storeId: store.id,
                status: "PUBLISHED",
                isAvailable: true,
              },
            },
          },
        },
        children: {
          where: {
            storeId: store.id,
            isActive: true,
          },
          select: {
            _count: {
              select: {
                products: {
                  where: {
                    storeId: store.id,
                    status: "PUBLISHED",
                    isAvailable: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),

    prisma.product.findMany({
      where: {
        storeId: store.id,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        compareAtPrice: true,
        shortDescription: true,
        isFeatured: true,
        isAvailable: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            altText: true,
            isPrimary: true,
            sortOrder: true,
          },
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
          ],
          take: 3,
        },
      },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
      take: 16,
    }),
  ]);

  const products = rawProducts.map((product) => ({
    ...product,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    createdAt: product.createdAt.toISOString(),
  }));

  // Fetch new arrivals independently so featured ranking cannot hide newer products.
  const rawNewArrivalProducts = await prisma.product.findMany({
    where: {
      storeId: store.id,
      status: "PUBLISHED",
      isAvailable: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      shortDescription: true,
      isFeatured: true,
      isAvailable: true,
      createdAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      images: {
        select: {
          id: true,
          imageUrl: true,
          altText: true,
          isPrimary: true,
          sortOrder: true,
        },
        orderBy: [
          { isPrimary: "desc" },
          { sortOrder: "asc" },
        ],
        take: 3,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const newArrivalProducts = rawNewArrivalProducts.map((product) => ({
    ...product,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    createdAt: product.createdAt.toISOString(),
  }));

  // Find products sold in accepted orders.
// Pending and cancelled orders are excluded.
const [salesByProduct, recentDiscountCandidates] = await Promise.all([
  prisma.order_item.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: {
        is: {
          storeId: store.id,
          status: {
            in: [
              "CONFIRMED",
              "PROCESSING",
              "READY",
              "SHIPPED",
              "DELIVERED",
            ],
          },
          paymentStatus: {
            notIn: ["FAILED", "REFUNDED"],
          },
        },
      },
    },
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 100,
  }),

  // Recent discounted products are used to fill any remaining spaces.
  prisma.product.findMany({
    where: {
      storeId: store.id,
      status: "PUBLISHED",
      isAvailable: true,
      compareAtPrice: { not: null },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      compareAtPrice: true,
      shortDescription: true,
      isFeatured: true,
      isAvailable: true,
      createdAt: true,

      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      images: {
        select: {
          id: true,
          imageUrl: true,
          altText: true,
          isPrimary: true,
          sortOrder: true,
        },
        orderBy: [
          { isPrimary: "desc" },
          { sortOrder: "asc" },
        ],
        take: 3,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  }),
]);

const soldProductIds = salesByProduct.flatMap((sale) =>
  sale.productId === null ? [] : [sale.productId],
);

// Retrieve discounted products from the actual sales ranking.
const soldDiscountCandidates =
  soldProductIds.length > 0
    ? await prisma.product.findMany({
        where: {
          storeId: store.id,
          status: "PUBLISHED",
          isAvailable: true,
          id: { in: soldProductIds },
          compareAtPrice: { not: null },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          compareAtPrice: true,
          shortDescription: true,
          isFeatured: true,
          isAvailable: true,
          createdAt: true,

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },

          images: {
            select: {
              id: true,
              imageUrl: true,
              altText: true,
              isPrimary: true,
              sortOrder: true,
            },
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
            ],
            take: 3,
          },
        },
      })
    : [];

// Build the quantity-sold lookup.
const soldQuantityByProduct = new Map<number, number>();

for (const sale of salesByProduct) {
  if (sale.productId !== null) {
    soldQuantityByProduct.set(
      sale.productId,
      sale._sum.quantity ?? 0,
    );
  }
}

// Combine sold products and recent discounts without duplicates.
const flashSaleCandidateMap = new Map<
  number,
  (typeof recentDiscountCandidates)[number]
>();

for (const product of recentDiscountCandidates) {
  flashSaleCandidateMap.set(product.id, product);
}

for (const product of soldDiscountCandidates) {
  flashSaleCandidateMap.set(product.id, product);
}

// Keep genuine discounts and rank by actual quantities sold.
const flashSaleProducts = Array.from(
  flashSaleCandidateMap.values(),
)
  .filter(
    (product) =>
      product.compareAtPrice !== null &&
      Number(product.compareAtPrice) > Number(product.price),
  )
  .sort((a, b) => {
    const salesDifference =
      (soldQuantityByProduct.get(b.id) ?? 0) -
      (soldQuantityByProduct.get(a.id) ?? 0);

    if (salesDifference !== 0) {
      return salesDifference;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  })
  .slice(0, 10)
  .map((product) => ({
    ...product,
    price: product.price.toString(),
    compareAtPrice: product.compareAtPrice?.toString() ?? null,
    createdAt: product.createdAt.toISOString(),
  }));

  const categoriesWithFallback = categories.map((category) => {
    const categoryProduct = products.find(
      (product) => product.category?.id === category.id,
    );

    const fallbackImage =
      categoryProduct?.images?.find((image) => image.isPrimary) ??
      categoryProduct?.images?.[0];

    const subcategoryProductCount = category.children.reduce(
      (total, child) => total + child._count.products,
      0,
    );

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      fallbackImageUrl: fallbackImage?.imageUrl ?? null,
      productCount:
        category._count.products + subcategoryProductCount,
    };
  });

  return (
    <HomeClient
      store={{
        slug: store.slug,
        name: store.name,
        displayName:
          store.profile?.displayName?.trim() ||
          store.profile?.businessName?.trim() ||
          store.name,
        tagline:
          store.profile?.tagline?.trim() ||
          "Thoughtfully chosen essentials for your kitchen.",
        description:
          store.profile?.description?.trim() ||
          store.description ||
          "Discover cookware, utensils, dining and everyday kitchen essentials.",
        aboutText: store.profile?.aboutText ?? null,
        logoUrl: store.profile?.logoUrl || store.logoUrl,
        phone: store.profile?.phone ?? null,
        whatsapp: store.profile?.whatsapp ?? null,
        email: store.profile?.email ?? null,
        facebookUrl: store.profile?.facebookUrl ?? null,
        instagramUrl: store.profile?.instagramUrl ?? null,
        tiktokUrl: store.profile?.tiktokUrl ?? null,
        currency: store.settings?.currency || store.currency || "LKR",
        primaryColor:
          store.theme?.primaryColor ||
          store.primaryColor ||
          "#34483A",
        secondaryColor: store.theme?.secondaryColor || "#292B25",
        accentColor: store.theme?.accentColor || "#B87856",
        backgroundColor: store.theme?.backgroundColor || "#F7F4ED",
        surfaceColor: store.theme?.surfaceColor || "#F0EDE4",
        textColor: store.theme?.textColor || "#292B25",
        mutedColor: store.theme?.mutedColor || "#77776D",
        heroOfferPercent: store.heroOfferPercent,
        announcementMessages,
        
      }}
      categories={categoriesWithFallback}
      products={products}
      flashSaleProducts={flashSaleProducts}
      newArrivalProducts={newArrivalProducts}
      heroSlides={store.heroSlides}
      shopHref="/shop"
    />
  );
}
