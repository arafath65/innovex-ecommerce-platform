
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const allowedStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

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
    return { error: "Unauthorized", status: 401 as const };
  }

  const user = await prisma.storeUser.findFirst({
    where: {
      id: session.userId,
      storeId: session.storeId,
      isActive: true,
    },
    include: {
      store: {
        select: { isActive: true },
      },
    },
  });

  if (!user || !user.store.isActive) {
    return { error: "Account or store is inactive", status: 403 as const };
  }

  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return { error: "You do not have permission", status: 403 as const };
  }

  return { user, session };
}

export async function GET() {
  try {
    const auth = await getAuthorizedUser();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const products = await prisma.product.findMany({
      where: {
        storeId: auth.session.storeId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("GET admin products error:", error);

    return NextResponse.json(
      { error: "Failed to load products" },
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