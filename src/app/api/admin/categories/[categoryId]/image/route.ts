import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMediaDirectory, toMediaUrl, getStoredMediaAbsolutePath } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_INPUT_SIZE = 5 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 2 * 1024 * 1024;

type RouteContext = {
  params: Promise<{ categoryId: string }>;
};

async function authorize() {
  const session = await getSession();

  if (!session) {
    return { error: "Unauthorized", status: 401 as const };
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

  return { storeId: user.storeId };
}

function getOwnedImagePath(
  imageUrl: string | null,
  storeId: number,
  categoryId: number,
) {
  if (!imageUrl) return null;

  const legacyPrefix =
    `/category-images/store-${storeId}/category-${categoryId}/`;
  const mediaPrefix =
    `/media/stores/${storeId}/categories/${categoryId}/`;

  if (imageUrl.includes("..")) return null;

  if (imageUrl.startsWith(mediaPrefix)) {
    return getStoredMediaAbsolutePath(imageUrl);
  }

  if (imageUrl.startsWith(legacyPrefix)) {
    const publicDirectory = path.resolve(process.cwd(), "public");
    const fullPath = path.resolve(publicDirectory, imageUrl.slice(1));
    const categoryDirectory = path.resolve(
      publicDirectory,
      "category-images",
      `store-${storeId}`,
      `category-${categoryId}`,
    );

    return fullPath.startsWith(`${categoryDirectory}${path.sep}`)
      ? fullPath
      : null;
  }

  return null;
}

async function removeOldFile(
  imageUrl: string | null,
  storeId: number,
  categoryId: number,
) {
  const oldPath = getOwnedImagePath(
    imageUrl,
    storeId,
    categoryId,
  );

  if (!oldPath) return;

  try {
    await unlink(oldPath);
  } catch {
    // The database remains authoritative if the old file
    // has already been removed.
  }
}

async function getCategory(
  categoryId: number,
  storeId: number,
) {
  return prisma.category.findFirst({
    where: {
      id: categoryId,
      storeId,
    },
    select: {
      id: true,
      imageUrl: true,
    },
  });
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  let savedFilePath: string | null = null;

  try {
    const auth = await authorize();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const { categoryId: rawCategoryId } = await params;
    const categoryId = Number(rawCategoryId);

    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const category = await getCategory(
      categoryId,
      auth.storeId,
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a category image" },
        { status: 400 },
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Use JPG, PNG or WebP images" },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_INPUT_SIZE) {
      return NextResponse.json(
        { error: "Image size must be between 1 byte and 5 MB" },
        { status: 400 },
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    let outputBuffer = await sharp(inputBuffer, {
      failOn: "error",
    })
      .rotate()
      .resize(800, 800, {
  fit: "contain",
  position: "centre",
  background: { r: 255, g: 255, b: 255, alpha: 1 },
})
      .webp({
        quality: 82,
        effort: 5,
      })
      .toBuffer();

    if (outputBuffer.length > MAX_OUTPUT_SIZE) {
      outputBuffer = await sharp(inputBuffer, {
        failOn: "error",
      })
        .rotate()
        .resize(640, 640, {
  fit: "contain",
  position: "centre",
  background: { r: 255, g: 255, b: 255, alpha: 1 },
})
        .webp({
          quality: 68,
          effort: 5,
        })
        .toBuffer();
    }

    if (outputBuffer.length > MAX_OUTPUT_SIZE) {
      return NextResponse.json(
        { error: "Could not compress this image below 2 MB" },
        { status: 400 },
      );
    }

    const fileName = `${randomUUID()}.webp`;

    const relativeDirectory =
      `stores/${auth.storeId}/categories/${categoryId}`;
    const directory = getMediaDirectory(relativeDirectory);

    await mkdir(directory, { recursive: true });

    savedFilePath = path.join(directory, fileName);

    await writeFile(savedFilePath, outputBuffer);

    const imageUrl = toMediaUrl(
      `${relativeDirectory}/${fileName}`,
    );

    await prisma.category.update({
      where: { id: categoryId },
      data: { imageUrl },
    });

    await removeOldFile(
      category.imageUrl,
      auth.storeId,
      categoryId,
    );

    return NextResponse.json({
      success: true,
      message: "Category image uploaded successfully",
      imageUrl,
    });
  } catch (error) {
    if (savedFilePath) {
      try {
        await unlink(savedFilePath);
      } catch {
        // Ignore cleanup errors.
      }
    }

    console.error("POST category image error:", error);

    return NextResponse.json(
      { error: "Failed to upload category image" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const auth = await authorize();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const { categoryId: rawCategoryId } = await params;
    const categoryId = Number(rawCategoryId);

    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const category = await getCategory(
      categoryId,
      auth.storeId,
    );

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: { imageUrl: null },
    });

    await removeOldFile(
      category.imageUrl,
      auth.storeId,
      categoryId,
    );

    return NextResponse.json({
      success: true,
      message: "Category image removed successfully",
    });
  } catch (error) {
    console.error("DELETE category image error:", error);

    return NextResponse.json(
      { error: "Failed to remove category image" },
      { status: 500 },
    );
  }
}