
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ storeId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requireSuperAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const id = Number((await params).storeId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid store ID." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const userId = Number(body.userId);
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { error: "Invalid administrator ID." },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const user = await prisma.store_user.findFirst({
      where: {
        id: userId,
        storeId: id,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: {
        id: true,
        name: true,
        username: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Store administrator not found." },
        { status: 404 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.store_user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await tx.app_session.deleteMany({
        where: { storeUserId: user.id },
      });
    });

    await writeAuditLog({
      storeId: id,
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "AUTH",
      action: "PASSWORD_RESET",
      entity: "STORE_USER",
      entityId: user.id,
      description: `${auth.session.name} reset the password for ${user.name} (${user.username ?? "no username"}).`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({
      success: true,
      username: user.username,
      message: "Store administrator password reset successfully.",
    });
  } catch (error) {
    console.error("POST store password reset error:", error);

    return NextResponse.json(
      { error: "Failed to reset store password." },
      { status: 500 },
    );
  }
}
