import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

type ProductForResponse = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price: unknown;
  compareAtPrice: unknown;
  shortDescription: string | null;
  description: string | null;
  status: string;
  isAvailable: boolean;
  isFeatured: boolean;
  category: {
    id: number;
    name: string;
  } | null;
  images: Array<{
    id: number;
    imageUrl: string;
    altText: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
};

function parseProductId(value: string) {
  const productId = Number(value);

  if (
    !Number.isInteger(productId) ||
    productId <= 0
  ) {
    return null;
  }

  return productId;
}

function mapProduct(
  product: ProductForResponse,
) {
  const price = Number(
    product.price,
  );

  const compareAtPrice =
    product.compareAtPrice ===
      null ||
    product.compareAtPrice ===
      undefined
      ? null
      : Number(
          product.compareAtPrice,
        );

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,

    price:
      Number.isFinite(price)
        ? price
        : null,

    compareAtPrice:
      compareAtPrice !== null &&
      Number.isFinite(
        compareAtPrice,
      )
        ? compareAtPrice
        : null,

    shortDescription:
      product.shortDescription,

    description:
      product.description,

    status:
      product.status,

    isAvailable:
      product.isAvailable,

    isFeatured:
      product.isFeatured,

    category:
      product.category,

    images:
      product.images,
  };
}

async function requireSession() {
  return await getSession();
}

async function getProductWithRelations(
  productId: number,
) {
  return await prisma.product.findUnique({
    where: {
      id: productId,
    },

    include: {
      category: {
        select: {
          id: true,
          name: true,
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

        select: {
          id: true,
          imageUrl: true,
          altText: true,
          sortOrder: true,
          isPrimary: true,
        },
      },
    },
  });
}

/*
|--------------------------------------------------------------------------
| GET PRODUCT
|--------------------------------------------------------------------------
*/

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await requireSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      productId: productIdValue,
    } = await context.params;

    const productId =
      parseProductId(
        productIdValue,
      );

    if (productId === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid product ID.",
        },
        {
          status: 400,
        },
      );
    }

    const product =
      await getProductWithRelations(
        productId,
      );

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      product:
        mapProduct(product),
    });
  } catch (error) {
    console.error(
      "Get admin product error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load product.",
      },
      {
        status: 500,
      },
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH PRODUCT
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const session =
      await requireSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const {
      productId: productIdValue,
    } = await context.params;

    const productId =
      parseProductId(
        productIdValue,
      );

    if (productId === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid product ID.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LOAD EXISTING PRODUCT
    |--------------------------------------------------------------------------
    */

    const existingProduct =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },

        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          compareAtPrice: true,
          shortDescription: true,
          description: true,
          status: true,
          isAvailable: true,
          isFeatured: true,
          categoryId: true,
        },
      });

    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | REQUEST BODY
    |--------------------------------------------------------------------------
    */

    const body =
      (await request.json()) as {
        name?: unknown;
        sku?: unknown;
        price?: unknown;
        compareAtPrice?: unknown;
        status?: unknown;
        isAvailable?: unknown;
        isFeatured?: unknown;
        categoryId?: unknown;
        shortDescription?: unknown;
        description?: unknown;
      };

    /*
    |--------------------------------------------------------------------------
    | NAME
    |--------------------------------------------------------------------------
    */

    const name =
      typeof body.name ===
      "string"
        ? body.name.trim()
        : existingProduct.name;

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product name is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | SKU
    |--------------------------------------------------------------------------
    */

    const sku =
      typeof body.sku ===
      "string"
        ? body.sku.trim() ||
          null
        : existingProduct.sku;

    /*
    |--------------------------------------------------------------------------
    | PRICE
    |
    | Your Prisma Product.price is required.
    | Therefore null is never sent to Prisma.
    |--------------------------------------------------------------------------
    */

    let price = Number(
      existingProduct.price,
    );

    if (
      body.price !== undefined
    ) {
      if (
        body.price === null ||
        body.price === ""
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Product price is required.",
          },
          {
            status: 400,
          },
        );
      }

      const requestedPrice =
        Number(body.price);

      if (
        !Number.isFinite(
          requestedPrice,
        ) ||
        requestedPrice < 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid product price.",
          },
          {
            status: 400,
          },
        );
      }

      price = requestedPrice;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product price is required.",
        },
        {
          status: 400,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | COMPARE-AT PRICE
    |--------------------------------------------------------------------------
    */

    let compareAtPrice:
      | number
      | null =
      existingProduct.compareAtPrice ===
        null ||
      existingProduct.compareAtPrice ===
        undefined
        ? null
        : Number(
            existingProduct.compareAtPrice,
          );

    if (
      body.compareAtPrice !==
      undefined
    ) {
      if (
        body.compareAtPrice ===
          null ||
        body.compareAtPrice ===
          ""
      ) {
        compareAtPrice = null;
      } else {
        const requestedCompareAtPrice =
          Number(
            body.compareAtPrice,
          );

        if (
          !Number.isFinite(
            requestedCompareAtPrice,
          ) ||
          requestedCompareAtPrice < 0
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Invalid compare-at price.",
            },
            {
              status: 400,
            },
          );
        }

        compareAtPrice =
          requestedCompareAtPrice;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | SHORT DESCRIPTION
    |--------------------------------------------------------------------------
    */

    const shortDescription =
      typeof body.shortDescription ===
      "string"
        ? body.shortDescription.trim() ||
          null
        : existingProduct.shortDescription;

    /*
    |--------------------------------------------------------------------------
    | DESCRIPTION
    |--------------------------------------------------------------------------
    */

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim() ||
          null
        : existingProduct.description;

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |
    | IMPORTANT:
    | This is typed from the actual Prisma-generated enum type.
    | This fixes:
    |
    | Type 'string' is not assignable to type 'ProductStatus'
    |--------------------------------------------------------------------------
    */

    let status:
      | typeof existingProduct.status
      | undefined;

    if (
      body.status ===
      "DRAFT"
    ) {
      status = "DRAFT";
    } else if (
      body.status ===
      "PUBLISHED"
    ) {
      status = "PUBLISHED";
    } else if (
      body.status ===
      "ARCHIVED"
    ) {
      status = "ARCHIVED";
    }

    /*
    |--------------------------------------------------------------------------
    | AVAILABILITY
    |--------------------------------------------------------------------------
    */

    let isAvailable:
      | boolean
      | undefined;

    if (
      typeof body.isAvailable ===
      "boolean"
    ) {
      isAvailable =
        body.isAvailable;
    }

    /*
    |--------------------------------------------------------------------------
    | FEATURED
    |--------------------------------------------------------------------------
    */

    let isFeatured:
      | boolean
      | undefined;

    if (
      typeof body.isFeatured ===
      "boolean"
    ) {
      isFeatured =
        body.isFeatured;
    }

    /*
    |--------------------------------------------------------------------------
    | CATEGORY
    |
    | We validate the category before updating the product.
    |--------------------------------------------------------------------------
    */

    let categoryUpdate:
      | {
          connect: {
            id: number;
          };
        }
      | {
          disconnect: true;
        }
      | undefined;

    if (
      body.categoryId !==
      undefined
    ) {
      if (
        body.categoryId ===
          null ||
        body.categoryId ===
          ""
      ) {
        categoryUpdate = {
          disconnect: true,
        };
      } else {
        const requestedCategoryId =
          Number(
            body.categoryId,
          );

        if (
          !Number.isInteger(
            requestedCategoryId,
          ) ||
          requestedCategoryId <= 0
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Invalid category ID.",
            },
            {
              status: 400,
            },
          );
        }

        const category =
          await prisma.category.findUnique(
            {
              where: {
                id: requestedCategoryId,
              },

              select: {
                id: true,
              },
            },
          );

        if (!category) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Selected category was not found.",
            },
            {
              status: 400,
            },
          );
        }

        categoryUpdate = {
          connect: {
            id:
              requestedCategoryId,
          },
        };
      }
    }

    /*
    |--------------------------------------------------------------------------
    | BUILD UPDATE DATA
    |--------------------------------------------------------------------------
    */

    const updateData = {
      name,
      sku,
      price,
      compareAtPrice,
      shortDescription,
      description,

      ...(status !==
      undefined
        ? {
            status,
          }
        : {}),

      ...(isAvailable !==
      undefined
        ? {
            isAvailable,
          }
        : {}),

      ...(isFeatured !==
      undefined
        ? {
            isFeatured,
          }
        : {}),

      ...(categoryUpdate !==
      undefined
        ? {
            category:
              categoryUpdate,
          }
        : {}),
    };

    /*
    |--------------------------------------------------------------------------
    | UPDATE PRODUCT
    |--------------------------------------------------------------------------
    */

    await prisma.product.update({
      where: {
        id: productId,
      },

      data: updateData,
    });

    /*
    |--------------------------------------------------------------------------
    | FETCH UPDATED PRODUCT WITH CATEGORY + IMAGES
    |--------------------------------------------------------------------------
    */

    const updatedProduct =
      await getProductWithRelations(
        productId,
      );

    if (!updatedProduct) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Product was updated but could not be loaded afterward.",
        },
        {
          status: 500,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json({
      success: true,
      message:
        "Product updated successfully.",
      product:
        mapProduct(
          updatedProduct,
        ),
    });
  } catch (error) {
    console.error(
      "Update admin product error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update product.",
      },
      {
        status: 500,
      },
    );
  }
}