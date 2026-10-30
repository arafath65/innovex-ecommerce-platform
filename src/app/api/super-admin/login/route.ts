import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createSuperAdminSession } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    const username =
      body && typeof body === "object" && "username" in body
        ? String((body as { username?: unknown }).username ?? "")
            .trim()
            .toLowerCase()
        : "";

    const password =
      body && typeof body === "object" && "password" in body
        ? String((body as { password?: unknown }).password ?? "")
        : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username and password are required.",
        },
        { status: 400 },
      );
    }

    const admin = await prisma.super_admin.findUnique({
      where: { username },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 },
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      admin.passwordHash,
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid username or password.",
        },
        { status: 401 },
      );
    }

    await createSuperAdminSession(admin.id);

    await writeAuditLog({
      superAdminId: admin.id,
      actorType: "SUPER_ADMIN",
      module: "AUTH",
      action: "LOGIN",
      entity: "SUPER_ADMIN",
      entityId: admin.id,
      description: `${admin.name} signed in to Super Admin.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error("Super Admin login error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process login.",
      },
      { status: 500 },
    );
  }
}
