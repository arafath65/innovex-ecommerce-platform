
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per image

const allowedTypes = {
  "image/jpeg": {
    extension: ".jpg",
    signature: [0xff, 0xd8, 0xff],
  },
  "image/png": {
    extension: ".png",
    signature: [0x89, 0x50, 0x4e, 0x47],
  },
  "image/webp": {
    extension: ".webp",
    signature: null,
  },
} as const;

type AllowedMimeType = keyof typeof allowedTypes;

function isAllowedMimeType(
  type: string
): type is AllowedMimeType {
  return Object.prototype.hasOwnProperty.call(
    allowedTypes,
    type
  );
}

function hasValidSignature(
  buffer: Buffer,
  type: AllowedMimeType
) {
  if (type === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  const signature = allowedTypes[type].signature;

  return (
    signature !== null &&
    signature.every((byte, index) => buffer[index] === byte)
  );
}

function getUploadDirectory() {
  const configured = process.env.UPLOAD_DIR?.trim();

  if (!configured) {
    throw new Error(
      "UPLOAD_DIR is not configured in the environment."
    );
  }

  return path.resolve(configured);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ productId: string }> }
) {
  const savedFiles: string[] = [];

  try {
    // 1. Authenticate
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: "Account or store is inactive" },
        { status: 403 }
      );
    }

    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You do not have permission" },
        { status: 403 }
      );
    }

    // 2. Validate product ID
    const { productId: rawProductId } = await context.params;
    const productId = Number(rawProductId);

    if (
      !Number.isSafeInteger(productId) ||
      productId <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    // 3. Verify product belongs to this store
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: session.storeId,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // 4. Read multipart form data
    const formData = await request.formData();
    const files = formData.getAll("images");

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one image" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} images per upload` },
        { status: 400 }
      );
    }

    const uploadDirectory = getUploadDirectory();

    const productDirectory = path.join(
      uploadDirectory,
      `store-${session.storeId}`,
      `product-${productId}`
    );

    await mkdir(productDirectory, { recursive: true });

    const existingCount = await prisma.productImage.count({
      where: { productId },
    });

    const createdImages: Awaited<
  ReturnType<typeof prisma.productImage.create>
>[] = [];

    // 5. Validate and save each image
    for (const file of files) {
      if (!(file instanceof File)) {
        throw new Error("Invalid uploaded file.");
      }

      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        throw new Error(
          "Each image must be greater than 0 bytes and no larger than 5 MB."
        );
      }

      if (!isAllowedMimeType(file.type)) {
        throw new Error(
          "Only JPEG, PNG, and WebP images are allowed."
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (!hasValidSignature(buffer, file.type)) {
        throw new Error(
          "An uploaded file does not match its image type."
        );
      }

      const extension = allowedTypes[file.type].extension;
      const filename = `${randomUUID()}${extension}`;

      const absolutePath = path.join(
        productDirectory,
        filename
      );

      // Store the file outside the Next.js app.
      await writeFile(absolutePath, buffer, {
        flag: "wx",
      });

      savedFiles.push(absolutePath);

      // Public URL served separately by Nginx.
      const imageUrl =
        `/product-images/store-${session.storeId}/product-${productId}/${filename}`;

      const image = await prisma.productImage.create({
        data: {
          productId,
          imageUrl,
          altText: null,
          sortOrder: existingCount + createdImages.length,
          isPrimary:
            existingCount === 0 &&
            createdImages.length === 0,
        },
      });

      createdImages.push(image);
    }

    return NextResponse.json(
      {
        message: "Images uploaded successfully",
        images: createdImages,
      },
      { status: 201 }
    );
  } catch (error) {
    // Remove files created by this request if something fails.
    await Promise.all(
      savedFiles.map((filePath) =>
        unlink(filePath).catch(() => undefined)
      )
    );

    if (
      error instanceof Error &&
      error.message.startsWith("Only ")
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      (
        error.message.startsWith("Each image") ||
        error.message.startsWith("An uploaded file") ||
        error.message.startsWith("Invalid uploaded")
      )
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("POST product images error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload images",
      },
      { status: 500 }
    );
  }
}