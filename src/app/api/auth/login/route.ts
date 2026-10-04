import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createStoreAdminSession } from "@/lib/auth";
import {
  getRequestAuditContext,
  writeAuditLog,
} from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const identifier =
      body &&
      typeof body === "object" &&
      "username" in body
        ? String(
            (body as { username?: unknown })
              .username ?? "",
          )
            .trim()
            .toLowerCase()
        : body &&
            typeof body === "object" &&
            "identifier" in body
          ? String(
              (
                body as {
                  identifier?: unknown;
                }
              ).identifier ?? "",
            )
              .trim()
              .toLowerCase()
          : "";

    const password =
      body &&
      typeof body === "object" &&
      "password" in body
        ? String(
            (body as { password?: unknown })
              .password ?? "",
          )
        : "";

    console.log("=== STORE LOGIN DEBUG ===");
    console.log("Identifier:", identifier);
    console.log(
      "Password received:",
      password ? "YES" : "NO",
    );

    if (!identifier || !password) {
      console.log("LOGIN FAILED: missing credentials");

      return NextResponse.json(
        {
          success: false,
          message:
            "Username and password are required.",
        },
        { status: 400 },
      );
    }

    const user = await prisma.store_user.findFirst({
      where: {
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

    console.log(
      "USER FOUND:",
      user
        ? {
            id: user.id,
            storeId: user.storeId,
            username: user.username,
            email: user.email,
            role: user.role,
            userActive: user.isActive,
            storeActive: user.store.isActive,
          }
        : null,
    );

    if (!user) {
      console.log("LOGIN FAILED: user not found");

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid username or password.",
        },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      console.log(
        "LOGIN FAILED: user inactive",
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid username or password.",
        },
        { status: 401 },
      );
    }

    if (!user.store.isActive) {
      console.log(
        "LOGIN FAILED: store inactive",
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid username or password.",
        },
        { status: 401 },
      );
    }

    console.log(
      "Hash prefix:",
      user.passwordHash.substring(0, 4),
    );

    console.log(
      "Hash length:",
      user.passwordHash.length,
    );

    const passwordValid =
      await bcrypt.compare(
        password,
        user.passwordHash,
      );

    console.log(
      "PASSWORD MATCH:",
      passwordValid,
    );

    if (!passwordValid) {
      console.log(
        "LOGIN FAILED: bcrypt mismatch",
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid username or password.",
        },
        { status: 401 },
      );
    }

    console.log(
      "PASSWORD VALID - creating session",
    );

    await createStoreAdminSession(user.id);

    console.log(
      "SESSION CREATED FOR USER:",
      user.id,
    );

    await writeAuditLog({
      storeId: user.store.id,
      storeUserId: user.id,
      actorType: "STORE_USER",
      module: "AUTH",
      action: "LOGIN",
      entity: "STORE_USER",
      entityId: user.id,
      description: `${user.name} signed in to ${user.store.name}.`,
      ...getRequestAuditContext(request),
    });

    console.log("LOGIN SUCCESS");

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
    console.error(
      "STORE LOGIN ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to process login.",
      },
      { status: 500 },
    );
  }
}
