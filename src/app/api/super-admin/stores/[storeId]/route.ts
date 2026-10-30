import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type Params = { params: Promise<{ storeId: string }> };

function parseStoreId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = parseStoreId((await params).storeId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid store ID." }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            categories: true,
            customers: true,
            orders: true,
            users: true,
          },
        },
        profile: true,
        settings: true,
        theme: true,
        users: {
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, store });
  } catch (error) {
    console.error("GET super admin store error:", error);
    return NextResponse.json({ error: "Failed to load store." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = parseStoreId((await params).storeId);
    if (id === null) {
      return NextResponse.json({ error: "Invalid store ID." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean." }, { status: 400 });
    }

    const store = await prisma.store.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    await writeAuditLog({
      storeId: id,
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "STORES",
      action: body.isActive ? "ACTIVATE" : "DEACTIVATE",
      entity: "STORE",
      entityId: id,
      description: `${auth.session.name} ${body.isActive ? "activated" : "deactivated"} ${store.name}.`,
      metadata: { isActive: body.isActive },
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, store });
  } catch (error) {
    console.error("PATCH super admin store error:", error);
    return NextResponse.json({ error: "Failed to update store." }, { status: 500 });
  }
}
