import { randomUUID } from "node:crypto";

import sharp from "sharp";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredMediaFile, saveMediaFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const IMAGE_FIELDS = {
  1: "image1Url",
  2: "image2Url",
  3: "image3Url",
  4: "image4Url",
} as const;

type Slot = keyof typeof IMAGE_FIELDS;

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
      role: { in: ["OWNER", "ADMIN"] },
      store: { isActive: true },
    },
    select: { id: true, storeId: true },
  });

  if (!user) {
    return { error: "You do not have permission", status: 403 as const };
  }

  return { storeId: user.storeId };
}

function parseSlot(value: FormDataEntryValue | string | null): Slot | null {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4
    ? parsed
    : null;
}

function getFieldData(slot: Slot, url: string | null) {
  switch (slot) {
    case 1: return { image1Url: url };
    case 2: return { image2Url: url };
    case 3: return { image3Url: url };
    case 4: return { image4Url: url };
  }
}

function isOwnedEditorialImage(url: string | null, storeId: number, slot: Slot) {
  return Boolean(
    url?.startsWith(`/media/stores/${storeId}/homepage-editorial/slot-${slot}/`),
  );
}

export async function POST(request: Request) {
  let savedUrl: string | null = null;

  try {
    const auth = await authorize();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const slot = parseSlot(formData.get("slot"));
    const file = formData.get("image");

    if (!slot) {
      return NextResponse.json({ error: "Choose an image slot from 1 to 4." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Select an image to upload." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG and WebP images are allowed." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_INPUT_BYTES) {
      return NextResponse.json({ error: "Image size must be between 1 byte and 10 MB." }, { status: 400 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { failOn: "error" }).metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return NextResponse.json({ error: "The uploaded file is not a valid image." }, { status: 400 });
    }

    let optimized = await sharp(input, { failOn: "error" })
      .rotate()
      .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();

    if (optimized.length > MAX_OUTPUT_BYTES) {
      optimized = await sharp(input, { failOn: "error" })
        .rotate()
        .resize(1100, 1100, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 68, effort: 5 })
        .toBuffer();
    }

    if (optimized.length > MAX_OUTPUT_BYTES) {
      return NextResponse.json({ error: "Could not optimize the image below 2 MB." }, { status: 400 });
    }

    const filename = `${randomUUID()}.webp`;
    const saved = await saveMediaFile(
      `stores/${auth.storeId}/homepage-editorial/slot-${slot}/${filename}`,
      optimized,
    );
    savedUrl = saved.url;

    const fieldData = getFieldData(slot, saved.url);
    const existing = await prisma.store_homepage_editorial.findUnique({
      where: { storeId: auth.storeId },
      select: { image1Url: true, image2Url: true, image3Url: true, image4Url: true },
    });

    const editorial = await prisma.store_homepage_editorial.upsert({
      where: { storeId: auth.storeId },
      create: { storeId: auth.storeId, ...fieldData },
      update: fieldData,
      select: { image1Url: true, image2Url: true, image3Url: true, image4Url: true },
    });

    const oldUrl = existing?.[IMAGE_FIELDS[slot]] ?? null;
    if (oldUrl && oldUrl !== saved.url && isOwnedEditorialImage(oldUrl, auth.storeId, slot)) {
      await deleteStoredMediaFile(oldUrl).catch((error) => {
        console.warn("Could not remove replaced editorial image:", error);
      });
    }

    savedUrl = null;
    return NextResponse.json({
      success: true,
      imageUrl: editorial[IMAGE_FIELDS[slot]],
      editorial,
      message: `Image ${slot} uploaded successfully.`,
    });
  } catch (error) {
    if (savedUrl) {
      await deleteStoredMediaFile(savedUrl).catch(() => undefined);
    }
    console.error("POST homepage editorial image error:", error);
    return NextResponse.json({ error: "Failed to upload homepage image." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const slot = parseSlot(searchParams.get("slot"));
    if (!slot) {
      return NextResponse.json({ error: "Invalid image slot." }, { status: 400 });
    }

    const existing = await prisma.store_homepage_editorial.findUnique({
      where: { storeId: auth.storeId },
      select: { image1Url: true, image2Url: true, image3Url: true, image4Url: true },
    });

    if (!existing) {
      return NextResponse.json({ success: true });
    }

    const oldUrl = existing[IMAGE_FIELDS[slot]];
    await prisma.store_homepage_editorial.update({
      where: { storeId: auth.storeId },
      data: getFieldData(slot, null),
    });

    if (oldUrl && isOwnedEditorialImage(oldUrl, auth.storeId, slot)) {
      await deleteStoredMediaFile(oldUrl).catch((error) => {
        console.warn("Could not remove editorial image:", error);
      });
    }

    return NextResponse.json({ success: true, message: `Image ${slot} removed.` });
  } catch (error) {
    console.error("DELETE homepage editorial image error:", error);
    return NextResponse.json({ error: "Failed to remove homepage image." }, { status: 500 });
  }
}
