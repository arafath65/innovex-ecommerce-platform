import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

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

    const directory = path.join(process.cwd(), "public", "uploads", "stores", String(session.storeId), "branding");
    await mkdir(directory, { recursive: true });

    const filename = `${randomUUID()}.${extension}`;
    const relativeUrl = `/uploads/stores/${session.storeId}/branding/${filename}`;
    await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));

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

    if (oldProfile?.logoUrl?.startsWith("/uploads/")) {
      const oldPath = path.join(process.cwd(), "public", oldProfile.logoUrl.replace(/^\//, ""));
      await unlink(oldPath).catch(() => undefined);
    }

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
