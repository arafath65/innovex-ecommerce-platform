import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED_PAGE_SIZES = [25, 50, 100] as const;

type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

function parsePositiveInteger(
  value: string | null,
  fallback: number,
) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

const allowedStatuses = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

async function getAuthorizedUser() {
  const session = await getSession();

  if (!session) {
    return {
      error: "Unauthorized",
      status: 401 as const,
    };
  }

  const user = await prisma.store_user.findFirst({
    where: {
      id: session.userId,
      storeId: session.storeId,
      isActive: true,
    },
    include: {
      store: {
        select: {
          isActive: true,
        },
      },
    },
  });

  if (!user || !user.store.isActive) {
    return {
      error: "Account or store is inactive",
      status: 403 as const,
    };
  }

  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return {
      error: "You do not have permission",
      status: 403 as const,
    };
  }

  return {
    user,
    session,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await getAuthorizedUser();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const searchParams = new URL(request.url).searchParams;

    const requestedPage = parsePositiveInteger(
      searchParams.get("page"),
      1,
    );

    const requestedPageSize = parsePositiveInteger(
      searchParams.get("pageSize"),
      25,
    );

    const pageSize = ALLOWED_PAGE_SIZES.includes(
      requestedPageSize as (typeof ALLOWED_PAGE_SIZES)[number],
    )
      ? requestedPageSize
      : 25;

    const search = searchParams.get("search")?.trim() ?? "";

    const rawStatus = searchParams.get("status")?.trim() ?? "";

    const status: ProductStatus | "" =
      rawStatus === "DRAFT" ||
      rawStatus === "PUBLISHED" ||
      rawStatus === "ARCHIVED"
        ? rawStatus
        : "";

    const availability =
      searchParams.get("availability")?.trim() ?? "";

    const featured =
      searchParams.get("featured")?.trim() ?? "";

    const where = {
      storeId: auth.session.storeId,

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                },
              },
              {
                slug: {
                  contains: search,
                },
              },
              {
                sku: {
                  contains: search,
                },
              },
            ],
          }
        : {}),

      ...(status
        ? {
            status,
          }
        : {}),

      ...(availability === "available"
        ? {
            isAvailable: true,
          }
        : availability === "unavailable"
          ? {
              isAvailable: false,
            }
          : {}),

      ...(featured === "featured"
        ? {
            isFeatured: true,
          }
        : featured === "not-featured"
          ? {
              isFeatured: false,
            }
          : {}),
    };

    const [
      total,
      totalOverall,
      published,
      draft,
      unavailable,
      featuredCount,
    ] = await Promise.all([
      prisma.product.count({ where }),

      prisma.product.count({
        where: {
          storeId: auth.session.storeId,
        },
      }),

      prisma.product.count({
        where: {
          storeId: auth.session.storeId,
          status: "PUBLISHED",
        },
      }),

      prisma.product.count({
        where: {
          storeId: auth.session.storeId,
          status: "DRAFT",
        },
      }),

      prisma.product.count({
        where: {
          storeId: auth.session.storeId,
          isAvailable: false,
        },
      }),

      prisma.product.count({
        where: {
          storeId: auth.session.storeId,
          isFeatured: true,
        },
      }),
    ]);

    const totalPages =
      total === 0 ? 0 : Math.ceil(total / pageSize);

    const page =
      totalPages === 0
        ? 1
        : Math.min(requestedPage, totalPages);

    const products = await prisma.product.findMany({
      where,

      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],

      skip: (page - 1) * pageSize,

      take: pageSize,

      select: {
        id: true,

        name: true,

        slug: true,

        sku: true,

        price: true,

        compareAtPrice: true,

        shortDescription: true,

        description: true,

        status: true,

        isAvailable: true,

        isFeatured: true,

        category: {
          select: {
            id: true,
            name: true,
          },
        },

        images: {
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
          ],

          select: {
            id: true,
            imageUrl: true,
            altText: true,
            isPrimary: true,
            sortOrder: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,

      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,

        price:
          product.price === null
            ? null
            : Number(product.price),

        compareAtPrice:
          product.compareAtPrice === null
            ? null
            : Number(product.compareAtPrice),

        shortDescription:
          product.shortDescription,

        description:
          product.description,

        status: product.status,

        isAvailable:
          product.isAvailable,

        isFeatured:
          product.isFeatured,

        category:
          product.category,

        images:
          product.images,
      })),

      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },

      stats: {
        total: totalOverall,
        published,
        draft,
        unavailable,
        featured: featuredCount,
      },
    });
  } catch (error) {
    console.error(
      "GET admin products error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load products.",
      },
      { status: 500 },
    );
  }
}


export async function POST(request: Request) {

  try {

    const auth = await getAuthorizedUser();



    if ("error" in auth) {

      return NextResponse.json(

        { error: auth.error },

        { status: auth.status },

      );

    }



    const body: unknown = await request.json();



    if (!body || typeof body !== "object" || Array.isArray(body)) {

      return NextResponse.json(

        { error: "Invalid request body" },

        { status: 400 },

      );

    }



    const data = body as Record<string, unknown>;



    const name =

      typeof data.name === "string" ? data.name.trim() : "";



    if (!name || name.length > 200) {

      return NextResponse.json(

        { error: "Product name is required (maximum 200 characters)" },

        { status: 400 },

      );

    }



    const priceInput = data.price;

    const priceString =

      typeof priceInput === "number" || typeof priceInput === "string"

        ? String(priceInput).trim()

        : "";



    if (!/^\d{1,10}(\.\d{1,2})?$/.test(priceString)) {

      return NextResponse.json(

        { error: "Enter a valid price with up to 2 decimal places" },

        { status: 400 },

      );

    }



    const price = new Prisma.Decimal(priceString);



    if (!price.isFinite() || price.lessThan(0)) {

      return NextResponse.json(

        { error: "Price must be zero or greater" },

        { status: 400 },

      );

    }



    let compareAtPrice: Prisma.Decimal | null = null;



    if (

      data.compareAtPrice !== undefined &&

      data.compareAtPrice !== null &&

      data.compareAtPrice !== ""

    ) {

      const compareInput = data.compareAtPrice;

      const compareString =

        typeof compareInput === "number" ||

        typeof compareInput === "string"

          ? String(compareInput).trim()

          : "";



      if (!/^\d{1,10}(\.\d{1,2})?$/.test(compareString)) {

        return NextResponse.json(

          { error: "Enter a valid compare-at price" },

          { status: 400 },

        );

      }



      compareAtPrice = new Prisma.Decimal(compareString);



      if (

        !compareAtPrice.isFinite() ||

        compareAtPrice.lessThan(0)

      ) {

        return NextResponse.json(

          { error: "Compare-at price must be zero or greater" },

          { status: 400 },

        );

      }

    }



    const description =

      typeof data.description === "string"

        ? data.description.trim()

        : null;



    const shortDescription =

      typeof data.shortDescription === "string"

        ? data.shortDescription.trim()

        : null;



    const sku =

      typeof data.sku === "string" && data.sku.trim()

        ? data.sku.trim()

        : null;



    if (sku && sku.length > 100) {

      return NextResponse.json(

        { error: "SKU cannot exceed 100 characters" },

        { status: 400 },

      );

    }



    if (

      shortDescription &&

      shortDescription.length > 500

    ) {

      return NextResponse.json(

        { error: "Short description cannot exceed 500 characters" },

        { status: 400 },

      );

    }



    const status =

      typeof data.status === "string"

        ? data.status

        : "DRAFT";



    if (

      !allowedStatuses.includes(

        status as (typeof allowedStatuses)[number],

      )

    ) {

      return NextResponse.json(

        { error: "Invalid product status" },

        { status: 400 },

      );

    }



    const isAvailable =

      typeof data.isAvailable === "boolean"

        ? data.isAvailable

        : true;



    const isFeatured =

      typeof data.isFeatured === "boolean"

        ? data.isFeatured

        : false;



    let categoryId: number | null = null;



    if (

      data.categoryId !== undefined &&

      data.categoryId !== null &&

      data.categoryId !== ""

    ) {

      categoryId = Number(data.categoryId);



      if (

        !Number.isSafeInteger(categoryId) ||

        categoryId <= 0

      ) {

        return NextResponse.json(

          { error: "Invalid category" },

          { status: 400 },

        );

      }



      const category = await prisma.category.findFirst({

        where: {

          id: categoryId,

          storeId: auth.session.storeId,

          isActive: true,

        },

        select: { id: true },

      });



      if (!category) {

        return NextResponse.json(

          { error: "Category not found for this store" },

          { status: 400 },

        );

      }

    }



    const baseSlug = makeSlug(name);



    if (!baseSlug) {

      return NextResponse.json(

        { error: "Product name cannot create a valid URL slug" },

        { status: 400 },

      );

    }



    const product = await prisma.$transaction(async (tx) => {

      let slug = baseSlug;

      let suffix = 1;



      while (

        await tx.product.findUnique({

          where: {

            storeId_slug: {

              storeId: auth.session.storeId,

              slug,

            },

          },

          select: { id: true },

        })

      ) {

        suffix += 1;

        slug = `${baseSlug}-${suffix}`;

      }



      return tx.product.create({

        data: {

          storeId: auth.session.storeId,

          categoryId,

          name,

          slug,

          sku,

          shortDescription,

          description,

          price,

          compareAtPrice,

          status: status as (typeof allowedStatuses)[number],

          isAvailable,

          isFeatured,

        },

        include: {

          category: {

            select: { id: true, name: true },

          },

          images: true,

        },

      });

    });



    return NextResponse.json(

      { message: "Product created successfully", product },

      { status: 201 },

    );

  } catch (error) {

    if (

      error instanceof Prisma.PrismaClientKnownRequestError &&

      error.code === "P2002"

    ) {

      return NextResponse.json(

        { error: "A product with this SKU already exists" },

        { status: 409 },

      );

    }



    console.error("POST admin products error:", error);



    return NextResponse.json(

      { error: "Failed to create product" },

      { status: 500 },

    );

  }

}
