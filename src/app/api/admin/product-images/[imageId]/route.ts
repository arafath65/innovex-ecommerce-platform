import { unlink } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    imageId: string;
  }>;
};

export async function DELETE(
  request: Request,
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

    const image = await prisma.productImage.findUnique({
      where: {
        id: imageId,
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!image) {
      return NextResponse.json(
        {
          success: false,
          message: "Product image not found.",
        },
        { status: 404 },
      );
    }

    await prisma.productImage.delete({
      where: {
        id: imageId,
      },
    });

    const imageUrl = image.imageUrl?.trim() ?? "";

    if (
      imageUrl.startsWith("/product-images/") &&
      !imageUrl.includes("..")
    ) {
      const relativePath = imageUrl.replace(/^\/+/, "");
      const absolutePath = path.join(
        process.cwd(),
        "public",
        relativePath,
      );

      try {
        await unlink(absolutePath);
      } catch (fileError) {
        const code =
          fileError && typeof fileError === "object" && "code" in fileError
            ? String(fileError.code)
            : "";

        if (code !== "ENOENT") {
          console.warn("Failed to remove product image file:", fileError);
        }
      }
    }

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
