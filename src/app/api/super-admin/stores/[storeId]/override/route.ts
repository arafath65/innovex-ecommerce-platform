import { NextResponse } from "next/server";

import { createSuperAdminStoreOverride } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";

export const runtime = "nodejs";

type Params = { params: Promise<{ storeId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const id = Number((await params).storeId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid store ID." }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true },
    });

    if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });
    if (!store.isActive) return NextResponse.json({ error: "Inactive stores cannot be entered." }, { status: 403 });

    await createSuperAdminStoreOverride(auth.session.id, id);

    await writeAuditLog({
      storeId: id,
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "STORES",
      action: "OVERRIDE_ENTER",
      entity: "STORE",
      entityId: id,
      description: `${auth.session.name} entered ${store.name} in Super Admin override mode.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, redirectTo: "/admin/dashboard" });
  } catch (error) {
    console.error("POST store override error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to enter store." }, { status: 500 });
  }
}
