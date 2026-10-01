import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

/*
 * Final stored image limit.
 *
 * 2 MB = 2,097,152 bytes.
 */
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

/*
 * Maximum original file accepted by the server.
 *
 * The original can be larger than 2 MB because the server will
 * compress/resize it before saving.
 */
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

const MAX_IMAGES_PER_PRODUCT = 5;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const OUTPUT_EXTENSION = "webp";

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

function createOutputFileName() {
  return `${Date.now()}-${randomUUID()}.${OUTPUT_EXTENSION}`;
}

/**
 * Compress and resize an image until the final WebP is <= 2 MB.
 *
 * WebP is used for all newly uploaded images so JPEG/PNG/WebP uploads
 * are normalized into one efficient format.
 */
async function optimizeImage(
  inputBuffer: Buffer,
) {
  let width = 2400;

  const qualityLevels = [
    82,
    76,
    70,
    64,
    58,
    52,
    46,
    40,
    36,
    32,
    28,
  ];

  let bestBuffer: Buffer | null = null;

  /*
   * Each outer pass lowers the maximum image dimension.
   * This protects us from very large camera images.
   */
  for (let pass = 0; pass < 8; pass += 1) {
    for (
      let qualityIndex = 0;
      qualityIndex < qualityLevels.length;
      qualityIndex += 1
    ) {
      const quality =
        qualityLevels[qualityIndex];

      const output = await sharp(inputBuffer)
        /*
         * Correct EXIF orientation before saving.
         */
        .rotate()
        /*
         * Keep good product-image dimensions without allowing
         * unnecessarily huge originals.
         */
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

      if (
        output.length <=
        MAX_OUTPUT_BYTES
      ) {
        return output;
      }
    }

    /*
     * Still too large: reduce dimensions and try again.
     */
    width = Math.floor(width * 0.82);

    if (width < 720) {
      width = 720;
    }

    /*
     * Once we reach a reasonably small dimension and have already
     * tried very low quality settings, continue to the final pass.
     */
    if (
      width === 720 &&
      pass >= 6
    ) {
      break;
    }
  }

  /*
   * Final safety check.
   *
   * We never save a file larger than 2 MB.
   */
  if (
    bestBuffer &&
    bestBuffer.length <=
      MAX_OUTPUT_BYTES
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
    /*
     * ---------------------------------------------------------------
     * AUTHENTICATION
     * ---------------------------------------------------------------
     */
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    /*
     * ---------------------------------------------------------------
     * PRODUCT ID
     * ---------------------------------------------------------------
     */
    const {
      productId:
        productIdValue,
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
     * ---------------------------------------------------------------
     * PRODUCT EXISTENCE
     * ---------------------------------------------------------------
     */
    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          name: true,
        },
      });

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

    /*
     * ---------------------------------------------------------------
     * CURRENT IMAGE COUNT
     * ---------------------------------------------------------------
     */
    const existingImageCount =
      await prisma.productImage.count({
        where: {
          productId,
        },
      });

    /*
     * ---------------------------------------------------------------
     * FORM DATA
     * ---------------------------------------------------------------
     */
    const formData =
      await request.formData();

    const entries =
      formData.getAll(
        "images",
      );

    const files =
      entries.filter(
        (entry): entry is File =>
          entry instanceof File &&
          entry.size > 0,
      );

    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select at least one image.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ---------------------------------------------------------------
     * MAX IMAGE COUNT
     * ---------------------------------------------------------------
     */
    if (
      existingImageCount +
        files.length >
      MAX_IMAGES_PER_PRODUCT
    ) {
      const remainingSlots =
        Math.max(
          0,
          MAX_IMAGES_PER_PRODUCT -
            existingImageCount,
        );

      return NextResponse.json(
        {
          success: false,
          message:
            remainingSlots > 0
              ? `This product already has ${existingImageCount} image(s). You can upload only ${remainingSlots} more.`
              : `This product already has the maximum of ${MAX_IMAGES_PER_PRODUCT} images.`,
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ---------------------------------------------------------------
     * VALIDATE ALL ORIGINAL FILES FIRST
     * ---------------------------------------------------------------
     */
    for (const file of files) {
      if (
        !ALLOWED_MIME_TYPES.has(
          file.type,
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} is not supported. Use JPG, PNG or WebP.`,
          },
          {
            status: 400,
          },
        );
      }

      if (
        file.size >
        MAX_INPUT_BYTES
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} is larger than the maximum original upload size of 15 MB.`,
          },
          {
            status: 400,
          },
        );
      }
    }

    /*
     * ---------------------------------------------------------------
     * STORAGE DIRECTORY
     * ---------------------------------------------------------------
     *
     * Keep the image URL under /product-images/ so the existing
     * delete-image route can continue to remove the physical file.
     *
     * New files are normalized to WebP.
     */
    const relativeDirectory =
      path.posix.join(
        "product-images",
        `product-${productId}`,
      );

    const absoluteDirectory =
      path.join(
        process.cwd(),
        "public",
        relativeDirectory,
      );

    await mkdir(
      absoluteDirectory,
      {
        recursive: true,
      },
    );

    /*
     * ---------------------------------------------------------------
     * UPLOAD EACH IMAGE
     * ---------------------------------------------------------------
     */
    const createdImages: Array<{
      id: number;
      imageUrl: string;
      altText: string | null;
      sortOrder: number;
      isPrimary: boolean;
    }> = [];

    const createdFilePaths: string[] = [];

    try {
      for (
        let index = 0;
        index < files.length;
        index += 1
      ) {
        const file = files[index];

        if (!file) {
          continue;
        }

        const inputArrayBuffer =
          await file.arrayBuffer();

        const inputBuffer =
          Buffer.from(
            inputArrayBuffer,
          );

        /*
         * Validate that the contents are actually an image.
         * Sharp will reject malformed/non-image files.
         */
        const metadata =
          await sharp(
            inputBuffer,
          ).metadata();

        if (
          !metadata.format
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                `${file.name} is not a valid image file.`,
            },
            {
              status: 400,
            },
          );
        }

        /*
         * -----------------------------------------------------------
         * COMPRESS
         * -----------------------------------------------------------
         */
        const optimizedBuffer =
          await optimizeImage(
            inputBuffer,
          );

        /*
         * Absolute safety check.
         */
        if (
          optimizedBuffer.length >
          MAX_OUTPUT_BYTES
        ) {
          throw new Error(
            `${file.name} could not be compressed below 2 MB.`,
          );
        }

        /*
         * -----------------------------------------------------------
         * FILE NAME
         * -----------------------------------------------------------
         */
        const fileName =
          createOutputFileName();

        const absoluteFilePath =
          path.join(
            absoluteDirectory,
            fileName,
          );

        const relativeFileUrl =
          `/${relativeDirectory}/${fileName}`;

        /*
         * -----------------------------------------------------------
         * WRITE OPTIMIZED FILE
         * -----------------------------------------------------------
         */
        await writeFile(
          absoluteFilePath,
          optimizedBuffer,
        );

        createdFilePaths.push(
          absoluteFilePath,
        );

        /*
         * -----------------------------------------------------------
         * PRIMARY / SORT ORDER
         * -----------------------------------------------------------
         *
         * First image ever uploaded for the product becomes primary.
         */
        const sortOrder =
          existingImageCount +
          index;

        const isPrimary =
          existingImageCount ===
            0 &&
          index === 0;

        /*
         * -----------------------------------------------------------
         * DATABASE
         * -----------------------------------------------------------
         */
        const created =
          await prisma.productImage.create(
            {
              data: {
                productId,
                imageUrl:
                  relativeFileUrl,
                altText:
                  product.name,
                sortOrder,
                isPrimary,
              },
              select: {
                id: true,
                imageUrl: true,
                altText: true,
                sortOrder: true,
                isPrimary: true,
              },
            },
          );

        createdImages.push(
          created,
        );
      }
    } catch (processingError) {
      /*
       * Remove files already written if anything fails.
       */
      await Promise.all(
        createdFilePaths.map(
          async (filePath) => {
            try {
              await unlink(
                filePath,
              );
            } catch {
              // Ignore cleanup errors.
            }
          },
        ),
      );

      throw processingError;
    }

    /*
     * ---------------------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------------------
     */
    return NextResponse.json(
      {
        success: true,
        message:
          createdImages.length === 1
            ? "Product image uploaded and compressed successfully."
            : `${createdImages.length} product images uploaded and compressed successfully.`,
        images:
          createdImages,
        maxImageSize:
          MAX_OUTPUT_BYTES,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Product image upload error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload product images.",
      },
      {
        status: 500,
      },
    );
  }
}