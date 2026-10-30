import { randomUUID } from "node:crypto";

import sharp from "sharp";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";
import { saveMediaFile, deleteStoredMediaFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_SLIDES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2_000_000;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

async function authorize() {
  const session = await getSession();

  if (!session) return { error: "Unauthorized", status: 401 as const };
  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    return { error: "You do not have permission", status: 403 as const };
  }

  return { session };
}

export async function GET() {
  const auth = await authorize();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const slides = await prisma.hero_slide.findMany({
    where: { storeId: auth.session.storeId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ success: true, heroSlides: slides });
}

export async function POST(request: Request) {
  try {
    const auth = await authorize();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const count = await prisma.hero_slide.count({
      where: { storeId: auth.session.storeId },
    });

    if (count >= MAX_SLIDES) {
      return NextResponse.json(
        { error: "A store can have a maximum of 3 hero slides." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Hero image is required." }, { status: 400 });
    }

    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      return NextResponse.json(
        { error: "Only JPG, PNG and WebP images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Original hero image must be 10 MB or smaller." },
        { status: 400 },
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { failOn: "error" }).metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return NextResponse.json({ error: "The uploaded file is not a valid image." }, { status: 400 });
    }

    let optimized = await sharp(input)
      .rotate()
      .resize({ width: 2400, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();

    if (optimized.length > MAX_OUTPUT_BYTES) {
      optimized = await sharp(input)
        .rotate()
        .resize({ width: 1600, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 68, effort: 5 })
        .toBuffer();
    }
    if (optimized.length > MAX_OUTPUT_BYTES) {
      return NextResponse.json({ error: "Hero image could not be compressed below 2 MB." }, { status: 400 });
    }

    const filename = `${randomUUID()}.webp`;
    const savedMedia = await saveMediaFile(
      `stores/${auth.session.storeId}/hero/${filename}`,
      optimized,
    );

    const nextOrder = count + 1;
    const slide = await prisma.hero_slide.create({
      data: {
        storeId: auth.session.storeId,
        imageUrl: savedMedia.url,
        eyebrow: String(formData.get("eyebrow") ?? "").trim() || null,
        title: String(formData.get("title") ?? "").trim() || null,
        accentText: String(formData.get("accentText") ?? "").trim() || null,
        description: String(formData.get("description") ?? "").trim() || null,
        buttonText: String(formData.get("buttonText") ?? "Shop now").trim() || null,
        buttonUrl: String(formData.get("buttonUrl") ?? "/shop").trim() || null,
        sortOrder: nextOrder,
        isActive: true,
      },
    });

    await writeAuditLog({
      storeId: auth.session.storeId,
      storeUserId: auth.session.userId,
      actorType: "STORE_USER",
      module: "HOMEPAGE",
      action: "CREATE",
      entity: "HERO_SLIDE",
      entityId: slide.id,
      description: `${auth.session.name} created homepage hero slide ${slide.id}.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, heroSlide: slide }, { status: 201 });
  } catch (error) {
    console.error("POST hero slide error:", error);
    return NextResponse.json({ error: "Failed to create hero slide" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(body.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid hero slide ID." }, { status: 400 });
    }

    const existing = await prisma.hero_slide.findFirst({
      where: { id, storeId: auth.session.storeId },
    });

    if (!existing) return NextResponse.json({ error: "Hero slide not found." }, { status: 404 });

    const slide = await prisma.hero_slide.update({
      where: { id },
      data: {
        eyebrow: String(body.eyebrow ?? "").trim() || null,
        title: String(body.title ?? "").trim() || null,
        accentText: String(body.accentText ?? "").trim() || null,
        description: String(body.description ?? "").trim() || null,
        buttonText: String(body.buttonText ?? "").trim() || null,
        buttonUrl: String(body.buttonUrl ?? "").trim() || null,
        sortOrder: Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : existing.sortOrder,
        isActive: body.isActive === undefined ? existing.isActive : Boolean(body.isActive),
      },
    });

    await writeAuditLog({
      storeId: auth.session.storeId,
      storeUserId: auth.session.userId,
      actorType: "STORE_USER",
      module: "HOMEPAGE",
      action: "UPDATE",
      entity: "HERO_SLIDE",
      entityId: slide.id,
      description: `${auth.session.name} updated homepage hero slide ${slide.id}.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, heroSlide: slide });
  } catch (error) {
    console.error("PATCH hero slide error:", error);
    return NextResponse.json({ error: "Failed to update hero slide" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    const slide = await prisma.hero_slide.findFirst({
      where: { id, storeId: auth.session.storeId },
    });

    if (!slide) return NextResponse.json({ error: "Hero slide not found." }, { status: 404 });

    await prisma.hero_slide.delete({ where: { id: slide.id } });

    await deleteStoredMediaFile(slide.imageUrl).catch((error) => {
      console.warn("Failed to delete hero slide media:", error);
    });

    const remaining = await prisma.hero_slide.findMany({
      where: { storeId: auth.session.storeId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });

    await prisma.$transaction(
      remaining.map((item, index) =>
        prisma.hero_slide.update({
          where: { id: item.id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    await writeAuditLog({
      storeId: auth.session.storeId,
      storeUserId: auth.session.userId,
      actorType: "STORE_USER",
      module: "HOMEPAGE",
      action: "DELETE",
      entity: "HERO_SLIDE",
      entityId: slide.id,
      description: `${auth.session.name} removed homepage hero slide ${slide.id}.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE hero slide error:", error);
    return NextResponse.json({ error: "Failed to remove hero slide" }, { status: 500 });
  }
}
