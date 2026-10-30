import { randomUUID } from "node:crypto";

import sharp from "sharp";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";
import { saveMediaFile, deleteStoredMediaFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 2_000_000;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "OWNER" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "You do not have permission" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Logo file is required." }, { status: 400 });
    }

    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Only JPG, PNG and WebP images are allowed." }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Logo must be 2 MB or smaller." }, { status: 400 });
    }

    const oldProfile = await prisma.store_profile.findUnique({
      where: { storeId: session.storeId },
      select: { logoUrl: true },
    });

    const input = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(input, { failOn: "error" }).metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return NextResponse.json({ error: "The uploaded file is not a valid image." }, { status: 400 });
    }

    const optimized = await sharp(input)
      .rotate()
      .resize(800, 800, {
        fit: "contain",
        withoutEnlargement: true,
      })
      .webp({ quality: 86, effort: 5 })
      .toBuffer();

    if (optimized.length > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Logo could not be compressed below 2 MB." }, { status: 400 });
    }

    const filename = `${randomUUID()}.webp`;
    const savedMedia = await saveMediaFile(
      `stores/${session.storeId}/branding/${filename}`,
      optimized,
    );
    const relativeUrl = savedMedia.url;

    await prisma.store_profile.upsert({
      where: { storeId: session.storeId },
      create: {
        storeId: session.storeId,
        displayName: session.storeName,
        logoUrl: relativeUrl,
      },
      update: {
        logoUrl: relativeUrl,
      },
    });

    await deleteStoredMediaFile(oldProfile?.logoUrl).catch((error) => {
      console.warn("Failed to delete previous store logo:", error);
    });

    await writeAuditLog({
      storeId: session.storeId,
      storeUserId: session.userId,
      actorType: "STORE_USER",
      module: "STORE_PROFILE",
      action: "UPDATE_LOGO",
      entity: "STORE_PROFILE",
      entityId: session.storeId,
      description: `${session.name} updated the store logo.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, logoUrl: relativeUrl });
  } catch (error) {
    console.error("POST store logo error:", error);
    return NextResponse.json({ error: "Failed to upload store logo" }, { status: 500 });
  }
}
