import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CreateProductBody = {
  barcode?: unknown;
  brand?: unknown;
  name?: unknown;
  sku?: unknown;
  price?: unknown;
  compareAtPrice?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  status?: unknown;
  isAvailable?: unknown;
  isFeatured?: unknown;
  categoryId?: unknown;
};

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function nullableString(value: unknown): string | null {
  const result = cleanString(value);
  return result || null;
}

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function createSlug(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || `product-${Date.now()}`;
}

async function createUniqueSlug(
  storeId: number,
  name: string,
): Promise<string> {
  const base = createSlug(name);

  let slug = base;
  let counter = 2;

  while (
    await prisma.product.findFirst({
      where: {
        storeId,
        slug,
      },
      select: {
        id: true,
      },
    })
  ) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const storeSlug = cleanString(session.storeSlug);

    if (!storeSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Store information is missing from the session.",
        },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: {
        slug: storeSlug,
      },
      select: {
        id: true,
        slug: true,
        isActive: true,
      },
    });

    if (!store || !store.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Store not found or inactive.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateProductBody;

    const barcode = nullableString(body.barcode);
    const brand = nullableString(body.brand);
    const name = cleanString(body.name);
    const sku = nullableString(body.sku);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Product name is required.",
        },
        { status: 400 },
      );
    }

    const price = parseMoney(body.price);

    if (price === null) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid selling price is required.",
        },
        { status: 400 },
      );
    }

    let compareAtPrice: number | null = null;

    if (
      body.compareAtPrice !== null &&
      body.compareAtPrice !== undefined &&
      body.compareAtPrice !== ""
    ) {
      compareAtPrice = parseMoney(body.compareAtPrice);

      if (compareAtPrice === null) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid compare-at price.",
          },
          { status: 400 },
        );
      }
    }

    const categoryId = parsePositiveInt(body.categoryId);

    if (categoryId !== null) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          storeId: store.id,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (!category) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected category was not found.",
          },
          { status: 400 },
        );
      }
    }

    const existingSku = sku
      ? await prisma.product.findFirst({
          where: {
            storeId: store.id,
            sku,
          },
          select: {
            id: true,
          },
        })
      : null;

    if (existingSku) {
      return NextResponse.json(
        {
          success: false,
          message: "This SKU already exists in your store.",
        },
        { status: 409 },
      );
    }

    const status =
      body.status === "PUBLISHED" ||
      body.status === "ARCHIVED" ||
      body.status === "DRAFT"
        ? body.status
        : "DRAFT";

    const isAvailable =
      typeof body.isAvailable === "boolean"
        ? body.isAvailable
        : true;

    const isFeatured =
      typeof body.isFeatured === "boolean"
        ? body.isFeatured
        : false;

    let globalProductId: number | null = null;
    let globalProductWasCreated = false;

    if (barcode) {
      const existingGlobalProduct =
        await prisma.global_product.findUnique({
          where: {
            barcode,
          },
          select: {
            id: true,
            barcode: true,
            brand: true,
            name: true,
            shortDescription: true,
            description: true,
          },
        });

      if (existingGlobalProduct) {
        globalProductId = existingGlobalProduct.id;
      } else {
        const newGlobalProduct =
          await prisma.global_product.create({
            data: {
              barcode,
              brand,
              name,
              shortDescription: nullableString(
                body.shortDescription,
              ),
              description: nullableString(body.description),
            },
            select: {
              id: true,
            },
          });

        globalProductId = newGlobalProduct.id;
        globalProductWasCreated = true;
      }
    }

    const localProductName = name;

    const slug = await createUniqueSlug(
      store.id,
      localProductName,
    );

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId,
        globalProductId,
        name: localProductName,
        slug,
        sku,
        shortDescription: nullableString(
          body.shortDescription,
        ),
        description: nullableString(body.description),
        price,
        compareAtPrice,
        status,
        isAvailable,
        isFeatured,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        globalProduct: {
          select: {
            id: true,
            barcode: true,
            brand: true,
            name: true,
            shortDescription: true,
            description: true,
          },
        },
        images: {
          orderBy: [
            {
              isPrimary: "desc",
            },
            {
              sortOrder: "asc",
            },
          ],
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully.",
        globalProductCreated: globalProductWasCreated,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          price: Number(product.price),
          compareAtPrice:
            product.compareAtPrice === null
              ? null
              : Number(product.compareAtPrice),
          shortDescription: product.shortDescription,
          description: product.description,
          status: product.status,
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
          category: product.category,
          globalProduct: product.globalProduct,
          images: product.images,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Create product with global catalog error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create product.",
      },
      { status: 500 },
    );
  }
}