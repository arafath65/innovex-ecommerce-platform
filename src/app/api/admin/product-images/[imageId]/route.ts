import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredMediaFile } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    imageId: string;
  }>;
};

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

    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "You do not have permission." },
        { status: 403 },
      );
    }

    const { imageId: imageIdText } = await context.params;
    const imageId = Number(imageIdText);

    if (!Number.isInteger(imageId) || imageId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid image ID.",
        },
        { status: 400 },
      );
    }

    const image = await prisma.product_image.findUnique({
      where: {
        id: imageId,
      },
      select: {
        id: true,
        imageUrl: true,
        product: {
          select: {
            storeId: true,
          },
        },
      },
    });

    if (!image || image.product.storeId !== session.storeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Product image not found.",
        },
        { status: 404 },
      );
    }

    await prisma.product_image.delete({
      where: {
        id: imageId,
      },
    });

    await deleteStoredMediaFile(image.imageUrl);

    return NextResponse.json({
      success: true,
      message: "Product image removed successfully.",
    });
  } catch (error) {
    console.error("Product image delete error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to remove product image.",
      },
      { status: 500 },
    );
  }
}
