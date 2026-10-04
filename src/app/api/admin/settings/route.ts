import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

async function getAuthorizedUser() {
  const session = await getSession();

  if (!session) {
    return {
      error: "Unauthorized",
      status: 401 as const,
    };
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

  return {
    session,
  };
}

export async function GET() {
  try {
    const auth = await getAuthorizedUser();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const store = await prisma.store.findUnique({
      where: {
        id: auth.session.storeId,
      },
      select: {
        name: true,
        slug: true,
        heroOfferPercent: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      settings: store,
    });
  } catch (error) {
    console.error("GET admin settings error:", error);

    return NextResponse.json(
      { error: "Failed to load store settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthorizedUser();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const body: unknown = await request.json();

    const value =
      body &&
      typeof body === "object" &&
      "heroOfferPercent" in body
        ? Number(
            (body as { heroOfferPercent?: unknown })
              .heroOfferPercent,
          )
        : NaN;

    if (
      !Number.isInteger(value) ||
      value < 0 ||
      value > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Hero offer percentage must be a whole number between 0 and 100.",
        },
        { status: 400 },
      );
    }

    const store = await prisma.store.update({
      where: {
        id: auth.session.storeId,
      },
      data: {
        heroOfferPercent: value,
      },
      select: {
        name: true,
        slug: true,
        heroOfferPercent: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings: store,
      message: "Storefront settings updated successfully.",
    });
  } catch (error) {
    console.error("PATCH admin settings error:", error);

    return NextResponse.json(
      { error: "Failed to update store settings" },
      { status: 500 },
    );
  }
}
