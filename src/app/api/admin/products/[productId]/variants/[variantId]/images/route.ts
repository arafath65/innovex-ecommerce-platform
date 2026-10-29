import { randomUUID } from "node:crypto";
import {
  mkdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    productId: string;
    variantId: string;
  }>;
};

const MAX_IMAGES_PER_VARIANT = 3;
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function parseId(value: string): number | null {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

async function getAuthorizedStoreId() {
  const session = await getSession();

  if (!session) {
    return {
      error: "Unauthorized.",
      status: 401 as const,
    };
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
    return {
      error: "Account or store is inactive.",
      status: 403 as const,
    };
  }

  if (
    user.role !== "OWNER" &&
    user.role !== "ADMIN"
  ) {
    return {
      error: "You do not have permission.",
      status: 403 as const,
    };
  }

  return {
    storeId: user.storeId,
  };
}

async function optimizeImage(
  inputBuffer: Buffer,
): Promise<Buffer> {
  const qualityLevels = [
    82, 76, 70, 64, 58, 52, 46, 40, 36, 32, 28,
  ];

  let width = 2400;
  let bestBuffer: Buffer | null = null;

  for (let pass = 0; pass < 8; pass += 1) {
    for (const quality of qualityLevels) {
      const output = await sharp(inputBuffer)
        .rotate()
        .resize({
          width,
          height: width,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 6,
        })
        .toBuffer();

      bestBuffer = output;

      if (output.length <= MAX_OUTPUT_BYTES) {
        return output;
      }
    }

    width = Math.max(
      720,
      Math.floor(width * 0.82),
    );
  }

  if (
    bestBuffer &&
    bestBuffer.length <= MAX_OUTPUT_BYTES
  ) {
    return bestBuffer;
  }

  throw new Error(
    "The image could not be compressed below 2 MB.",
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const auth = await getAuthorizedStoreId();

    if ("error" in auth) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error,
        },
        { status: auth.status },
      );
    }

    const {
      productId: productIdText,
      variantId: variantIdText,
    } = await context.params;

    const productId = parseId(productIdText);
    const variantId = parseId(variantIdText);

    if (!productId || !variantId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product or variant ID.",
        },
        { status: 400 },
      );
    }

    const variant =
      await prisma.product_variant.findFirst({
        where: {
          id: variantId,
          productId,
          storeId: auth.storeId,
        },
        select: {
          id: true,
          imageUrl: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Variant not found in this store.",
        },
        { status: 404 },
      );
    }

    const existingCount =
      await prisma.product_variant_image.count({
        where: {
          variantId,
        },
      });

    const formData = await request.formData();

    const files = formData
      .getAll("images")
      .filter(
        (entry): entry is File =>
          entry instanceof File &&
          entry.size > 0,
      );

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Select at least one image.",
        },
        { status: 400 },
      );
    }

    if (
      existingCount + files.length >
      MAX_IMAGES_PER_VARIANT
    ) {
      const remaining = Math.max(
        0,
        MAX_IMAGES_PER_VARIANT - existingCount,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            remaining > 0
              ? `This variant has ${existingCount} image(s). You can add only ${remaining} more.`
              : "This variant already has the maximum of 3 images.",
        },
        { status: 400 },
      );
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} is not supported. Use JPG, PNG or WebP.`,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_INPUT_BYTES) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} exceeds the 15 MB upload limit.`,
          },
          { status: 400 },
        );
      }
    }

    const relativeDirectory = path.posix.join(
      "product-images",
      `variant-${variantId}`,
    );

    const absoluteDirectory = path.join(
      process.cwd(),
      "public",
      relativeDirectory,
    );

    await mkdir(absoluteDirectory, {
      recursive: true,
    });

    const createdIds: number[] = [];
    const createdFilePaths: string[] = [];

    try {
      for (
        let index = 0;
        index < files.length;
        index += 1
      ) {
        const file = files[index];

        if (!file) continue;

        const inputBuffer = Buffer.from(
          await file.arrayBuffer(),
        );

        const metadata =
          await sharp(inputBuffer).metadata();

        if (
          !metadata.format ||
          !["jpeg", "png", "webp"].includes(
            metadata.format,
          )
        ) {
          throw new Error(
            `${file.name} is not a valid JPG, PNG or WebP image.`,
          );
        }

        const optimizedBuffer =
          await optimizeImage(inputBuffer);

        const fileName =
          `${Date.now()}-${randomUUID()}.webp`;

        const absoluteFilePath = path.join(
          absoluteDirectory,
          fileName,
        );

        const imageUrl =
          `/${relativeDirectory}/${fileName}`;

        await writeFile(
          absoluteFilePath,
          optimizedBuffer,
        );

        createdFilePaths.push(
          absoluteFilePath,
        );

        const isFirstImage =
          existingCount === 0 &&
          index === 0;

        const saved =
          await prisma.product_variant_image.create({
            data: {
              variantId,
              imageUrl,
              altText: variant.product.name,
              sortOrder: existingCount + index,
              isPrimary: isFirstImage,
            },
            select: {
              id: true,
              imageUrl: true,
              altText: true,
              sortOrder: true,
              isPrimary: true,
            },
          });

        createdIds.push(saved.id);
      }

      const firstImage =
        await prisma.product_variant_image.findFirst({
          where: {
            variantId,
          },
          orderBy: [
            { isPrimary: "desc" },
            { sortOrder: "asc" },
            { id: "asc" },
          ],
          select: {
            imageUrl: true,
          },
        });

      // Keep the legacy image field synchronized with
      // the first gallery image for compatibility.
      await prisma.product_variant.update({
        where: {
          id: variantId,
        },
        data: {
          imageUrl:
            firstImage?.imageUrl ?? variant.imageUrl,
        },
      });
    } catch (uploadError) {
      if (createdIds.length > 0) {
        await prisma.product_variant_image
          .deleteMany({
            where: {
              id: {
                in: createdIds,
              },
            },
          })
          .catch(() => undefined);
      }

      await Promise.all(
        createdFilePaths.map(async (filePath) => {
          try {
            await unlink(filePath);
          } catch {
            // Ignore cleanup errors.
          }
        }),
      );

      throw uploadError;
    }

    const images =
      await prisma.product_variant_image.findMany({
        where: {
          variantId,
        },
        orderBy: [
          { isPrimary: "desc" },
          { sortOrder: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          imageUrl: true,
          altText: true,
          sortOrder: true,
          isPrimary: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Variant images uploaded successfully.",
        images,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "Variant image upload error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload variant images.",
      },
      { status: 500 },
    );
  }
}