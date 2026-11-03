import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const EDITORIAL_SELECT = {
  isEnabled: true,
  eyebrow: true,
  title: true,
  description: true,
  buttonText: true,
  buttonUrl: true,
  image1Url: true,
  image1Alt: true,
  image1Link: true,
  image2Url: true,
  image2Alt: true,
  image2Link: true,
  image3Url: true,
  image3Alt: true,
  image3Link: true,
  image4Url: true,
  image4Alt: true,
  image4Link: true,
} as const;

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

  return { session, storeId: user.storeId };
}

function textValue(value: unknown, maxLength: number, field: string) {
  if (typeof value !== "string") {
    throw new Error(`${field} must be text.`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

function internalPath(value: unknown, field: string, fallback = "") {
  const trimmed = textValue(value, 500, field);
  if (!trimmed) return fallback;

  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.split("/").some((part) => part === "..")
  ) {
    throw new Error(`${field} must be a safe store-relative path, such as /shop.`);
  }

  return trimmed;
}

export async function GET() {
  try {
    const auth = await authorize();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const editorial = await prisma.store_homepage_editorial.findUnique({
      where: { storeId: auth.storeId },
      select: EDITORIAL_SELECT,
    });

    return NextResponse.json({ success: true, editorial });
  } catch (error) {
    console.error("GET homepage editorial error:", error);
    return NextResponse.json(
      { error: "Failed to load homepage editorial settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const value = body as Record<string, unknown>;
    if (typeof value.isEnabled !== "boolean") {
      return NextResponse.json({ error: "Section visibility is required." }, { status: 400 });
    }

    let data;
    try {
      data = {
        isEnabled: value.isEnabled,
        eyebrow: textValue(value.eyebrow, 120, "Small heading"),
        title: textValue(value.title, 240, "Main heading"),
        description: textValue(value.description, 600, "Description"),
        buttonText: textValue(value.buttonText, 100, "Button label"),
        buttonUrl: internalPath(value.buttonUrl, "Button link", "/shop"),
        image1Alt: textValue(value.image1Alt ?? "", 180, "Image 1 alt text") || null,
        image1Link: internalPath(value.image1Link, "Image 1 link") || null,
        image2Alt: textValue(value.image2Alt ?? "", 180, "Image 2 alt text") || null,
        image2Link: internalPath(value.image2Link, "Image 2 link") || null,
        image3Alt: textValue(value.image3Alt ?? "", 180, "Image 3 alt text") || null,
        image3Link: internalPath(value.image3Link, "Image 3 link") || null,
        image4Alt: textValue(value.image4Alt ?? "", 180, "Image 4 alt text") || null,
        image4Link: internalPath(value.image4Link, "Image 4 link") || null,
      };
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid editorial settings." },
        { status: 400 },
      );
    }

    const currentImages = await prisma.store_homepage_editorial.findUnique({
      where: { storeId: auth.storeId },
      select: { image1Url: true, image2Url: true, image3Url: true, image4Url: true },
    });

    if (data.isEnabled && ![
      currentImages?.image1Url,
      currentImages?.image2Url,
      currentImages?.image3Url,
      currentImages?.image4Url,
    ].every(Boolean)) {
      return NextResponse.json(
        { error: "Upload all four images before enabling this homepage section." },
        { status: 400 },
      );
    }

    const editorial = await prisma.store_homepage_editorial.upsert({
      where: { storeId: auth.storeId },
      create: {
        storeId: auth.storeId,
        ...data,
      },
      update: data,
      select: EDITORIAL_SELECT,
    });

    return NextResponse.json({
      success: true,
      editorial,
      message: "Homepage editorial section saved.",
    });
  } catch (error) {
    console.error("PATCH homepage editorial error:", error);
    return NextResponse.json(
      { error: "Failed to save homepage editorial settings." },
      { status: 500 },
    );
  }
}
