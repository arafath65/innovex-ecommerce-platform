import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredMediaFile } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    productId: string;
    variantId: string;
    imageId: string;
  }>;
};

function parseId(value: string): number | null {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
) {
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

    const user = await prisma.store_user.findFirst({
      where: {
        id: session.userId,
        storeId: session.storeId,
        isActive: true,
      },
      select: {
        storeId: true,
        role: true,
        store: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.store.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Account or store is inactive.",
        },
        { status: 403 },
      );
    }

    if (
      user.role !== "OWNER" &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission.",
        },
        { status: 403 },
      );
    }

    const {
      productId: productIdText,
      variantId: variantIdText,
      imageId: imageIdText,
    } = await context.params;

    const productId = parseId(productIdText);
    const variantId = parseId(variantIdText);
    const imageId = parseId(imageIdText);

    if (!productId || !variantId || !imageId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product, variant or image ID.",
        },
        { status: 400 },
      );
    }

    const variant =
      await prisma.product_variant.findFirst({
        where: {
          id: variantId,
          productId,
          storeId: user.storeId,
        },
        select: {
          id: true,
          imageUrl: true,
        },
      });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          message: "Variant not found in this store.",
        },
        { status: 404 },
      );
    }

    const image =
      await prisma.product_variant_image.findFirst({
        where: {
          id: imageId,
          variantId,
        },
        select: {
          id: true,
          imageUrl: true,
          isPrimary: true,
        },
      });

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          message: "Variant image not found.",
        },
        { status: 404 },
      );
    }

    const shouldReplacePrimary =
      image.isPrimary ||
      variant.imageUrl === image.imageUrl;

    const nextImage =
      await prisma.$transaction(async (tx) => {
        await tx.product_variant_image.delete({
          where: {
            id: image.id,
          },
        });

        const remaining =
          await tx.product_variant_image.findMany({
            where: {
              variantId,
            },
            orderBy: [
              { sortOrder: "asc" },
              { id: "asc" },
            ],
            select: {
              id: true,
              imageUrl: true,
              isPrimary: true,
              sortOrder: true,
            },
          });

        if (shouldReplacePrimary) {
          const selected = remaining[0] ?? null;

          await tx.product_variant_image.updateMany({
            where: {
              variantId,
            },
            data: {
              isPrimary: false,
            },
          });

          if (selected) {
            await tx.product_variant_image.update({
              where: {
                id: selected.id,
              },
              data: {
                isPrimary: true,
              },
            });
          }

          await tx.product_variant.update({
            where: {
              id: variantId,
            },
            data: {
              imageUrl:
                selected?.imageUrl ?? null,
            },
          });

          return selected;
        }

        // Keep image ordering compact after removal.
        for (
          let index = 0;
          index < remaining.length;
          index += 1
        ) {
          const remainingImage = remaining[index];

          if (
            remainingImage &&
            remainingImage.sortOrder !== index
          ) {
            await tx.product_variant_image.update({
              where: {
                id: remainingImage.id,
              },
              data: {
                sortOrder: index,
              },
            });
          }
        }

        return null;
      });

    await deleteStoredMediaFile(image.imageUrl);

    return NextResponse.json({
      success: true,
      message: "Variant image removed successfully.",
      nextPrimaryImage: nextImage?.imageUrl ?? null,
    });
  } catch (error) {
    console.error(
      "Variant image deletion error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to remove variant image.",
      },
      { status: 500 },
    );
  }
}