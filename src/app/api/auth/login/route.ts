import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createStoreAdminSession } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";
import { resolveStorefrontForCurrentRequest } from "@/lib/storefront-domain";

export const runtime = "nodejs";

type LoginBody = {
  storeSlug?: unknown;
  username?: unknown;
  email?: unknown;
  identifier?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const storeSlug = String(body.storeSlug ?? "")
      .trim()
      .toLowerCase();

    const identifier = String(
      body.username ??
        body.email ??
        body.identifier ??
        "",
    )
      .trim()
      .toLowerCase();

    const password = String(body.password ?? "");

    if (!storeSlug) {
      return NextResponse.json(
        {
          success: false,
          message: "Store information is required.",
        },
        { status: 400 },
      );
    }

    const storefront = await resolveStorefrontForCurrentRequest();
    if (storefront.kind === "store" && storefront.storeSlug !== storeSlug) {
      return NextResponse.json(
        { success: false, message: "The requested store does not match this domain." },
        { status: 403 },
      );
    }
    if (storefront.kind === "unmapped" && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, message: "This domain is not connected to an active store." },
        { status: 404 },
      );
    }

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username/email and password are required.",
        },
        { status: 400 },
      );
    }

    const user = await prisma.store_user.findFirst({
      where: {
        store: {
          slug: storeSlug,
          isActive: true,
        },
        OR: [
          {
            username: identifier,
          },
          {
            email: identifier,
          },
        ],
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !user ||
      !user.isActive ||
      !user.store.isActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username/email or password.",
        },
        { status: 401 },
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username/email or password.",
        },
        { status: 401 },
      );
    }

    await createStoreAdminSession(user.id);

    const auditContext = getRequestAuditContext(request);

    await writeAuditLog({
      storeId: user.store.id,
      storeUserId: user.id,
      actorType: "STORE_USER",
      module: "AUTH",
      action: "LOGIN",
      entity: "STORE_USER",
      entityId: user.id,
      description: `${user.name} signed in to ${user.store.name}.`,
      ...auditContext,
    });

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        storeId: user.store.id,
        storeSlug: user.store.slug,
      },
    });
  } catch (error) {
    console.error("Store admin login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process login.",
      },
      { status: 500 },
    );
  }
}