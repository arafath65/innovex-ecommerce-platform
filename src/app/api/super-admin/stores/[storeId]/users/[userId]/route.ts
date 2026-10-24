
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ storeId: string; userId: string }>;
};

function parsePositiveId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireSuperAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const { storeId: storeIdParam, userId: userIdParam } = await params;
    const storeId = parsePositiveId(storeIdParam);
    const userId = parsePositiveId(userIdParam);

    if (storeId === null || userId === null) {
      return NextResponse.json(
        { error: "Invalid store or administrator ID." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const isActive = body.isActive;

    if (!name || name.length > 150) {
      return NextResponse.json(
        { error: "Administrator name is required and must not exceed 150 characters." },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9._-]{3,100}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3–100 characters and contain only lowercase letters, numbers, dots, underscores, or hyphens.",
        },
        { status: 400 },
      );
    }

    if (
      email.length > 191 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "Account status must be provided." },
        { status: 400 },
      );
    }

    const user = await prisma.store_user.findFirst({
      where: {
        id: userId,
        storeId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: {
        id: true,
        storeId: true,
        name: true,
        username: true,
        email: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Store administrator not found." },
        { status: 404 },
      );
    }

    const usernameConflict = await prisma.store_user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (usernameConflict) {
      return NextResponse.json(
        { error: "That username is already in use." },
        { status: 409 },
      );
    }

    const emailConflict = await prisma.store_user.findFirst({
      where: {
        storeId,
        email,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (emailConflict) {
      return NextResponse.json(
        { error: "That email is already used by another user in this store." },
        { status: 409 },
      );
    }

    const credentialsChanged =
      user.name !== name ||
      user.username !== username ||
      user.email !== email ||
      user.isActive !== isActive;

    const updatedUser = await prisma.store_user.update({
      where: { id: userId },
      data: { name, username, email, isActive },
      select: {
        id: true,
        storeId: true,
        name: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (credentialsChanged) {
      await prisma.app_session.deleteMany({
        where: { storeUserId: userId },
      });
    }

    await writeAuditLog({
      storeId,
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "STORES",
      action: "UPDATE_ADMINISTRATOR",
      entity: "STORE_USER",
      entityId: userId,
      description: `${auth.session.name} updated administrator ${updatedUser.name} for store ID ${storeId}.`,
      metadata: {
        changedFields: [
          ...(user.name !== name ? ["name"] : []),
          ...(user.username !== username ? ["username"] : []),
          ...(user.email !== email ? ["email"] : []),
          ...(user.isActive !== isActive ? ["isActive"] : []),
        ],
        isActive,
      },
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Store administrator updated successfully.",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That username or email is already in use." },
        { status: 409 },
      );
    }

    console.error("PATCH store administrator error:", error);

    return NextResponse.json(
      { error: "Failed to update store administrator." },
      { status: 500 },
    );
  }
}
