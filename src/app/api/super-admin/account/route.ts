import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = await prisma.super_admin.findUnique({
    where: { id: auth.session.id },
    select: { id: true, name: true, username: true, email: true, isActive: true, createdAt: true },
  });

  if (!admin || !admin.isActive) {
    return NextResponse.json({ error: "Super Admin account is inactive or not found." }, { status: 403 });
  }

  return NextResponse.json({ success: true, account: admin });
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const emailRaw = String(body.email ?? "").trim().toLowerCase();
    const email = emailRaw || null;

    if (!name || name.length > 150) {
      return NextResponse.json({ error: "Name is required and must not exceed 150 characters." }, { status: 400 });
    }

    if (!/^[a-z0-9._-]{3,100}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3-100 characters and contain only letters, numbers, dots, underscores or hyphens." }, { status: 400 });
    }

    const conflict = await prisma.super_admin.findFirst({
      where: {
        id: { not: auth.session.id },
        OR: [
          { username },
          ...(email ? [{ email }] : []),
        ],
      },
      select: { id: true },
    });

    if (conflict) {
      return NextResponse.json({ error: "That username or email is already in use." }, { status: 409 });
    }

    const admin = await prisma.super_admin.update({
      where: { id: auth.session.id },
      data: { name, username, email },
      select: { id: true, name: true, username: true, email: true, isActive: true, createdAt: true },
    });

    await writeAuditLog({
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "ACCOUNT",
      action: "UPDATE",
      entity: "SUPER_ADMIN",
      entityId: auth.session.id,
      description: `${auth.session.name} updated the Super Admin account profile.`,
      metadata: { username, email },
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, account: admin, message: "Account profile updated successfully." });
  } catch (error) {
    console.error("PATCH super admin account error:", error);
    return NextResponse.json({ error: "Failed to update account." }, { status: 500 });
  }
}
