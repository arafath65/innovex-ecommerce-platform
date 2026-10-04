import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    const user = await prisma.store_user.findUnique({ where: { id: session.userId }, select: { passwordHash: true, name: true } });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.store_user.update({ where: { id: session.userId }, data: { passwordHash } });

    await writeAuditLog({
      storeId: session.storeId,
      storeUserId: session.actorType === "STORE_USER" ? session.userId : null,
      superAdminId: session.superAdminId,
      actorType: session.actorType,
      module: "AUTH",
      action: "PASSWORD_CHANGE",
      entity: "STORE_USER",
      entityId: session.userId,
      description: session.isImpersonating ? `Super Admin changed the password for ${user.name}.` : `${user.name} changed their password.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("Store password change error:", error);
    return NextResponse.json({ error: "Failed to change password." }, { status: 500 });
  }
}
