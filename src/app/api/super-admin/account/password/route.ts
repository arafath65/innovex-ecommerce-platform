import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "Current password, new password and confirmation are required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New password and confirmation do not match." }, { status: 400 });
    }

    const admin = await prisma.super_admin.findUnique({
      where: { id: auth.session.id },
      select: { id: true, name: true, passwordHash: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json({ error: "Super Admin account is inactive or not found." }, { status: 403 });
    }

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    await prisma.super_admin.update({
      where: { id: admin.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });

    await prisma.app_session.deleteMany({
      where: {
        superAdminId: admin.id,
      },
    });

    await writeAuditLog({
      superAdminId: admin.id,
      actorType: "SUPER_ADMIN",
      module: "ACCOUNT",
      action: "PASSWORD_CHANGE",
      entity: "SUPER_ADMIN",
      entityId: admin.id,
      description: `${admin.name} changed the Super Admin password.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, message: "Password changed. Please sign in again." });
  } catch (error) {
    console.error("POST super admin password error:", error);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
