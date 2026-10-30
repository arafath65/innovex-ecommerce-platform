import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const requestedPage = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") ?? 25) || 25));
    const storeIdValue = Number(searchParams.get("storeId") ?? 0);
    const moduleFilter = searchParams.get("module")?.trim() ?? "";
    const actionFilter = searchParams.get("action")?.trim() ?? "";
    const search = searchParams.get("search")?.trim() ?? "";

    const where = {
      actorType: "SUPER_ADMIN" as const,
      ...(Number.isSafeInteger(storeIdValue) && storeIdValue > 0 ? { storeId: storeIdValue } : {}),
      ...(moduleFilter ? { module: moduleFilter } : {}),
      ...(actionFilter ? { action: actionFilter } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search } },
              { entity: { contains: search } },
              { action: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, logs, stores] = await Promise.all([
      prisma.audit_log.count({ where }),
      prisma.audit_log.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (requestedPage - 1) * pageSize,
        take: pageSize,
        include: {
          store: { select: { id: true, name: true, slug: true } },
          superAdmin: { select: { id: true, name: true, username: true } },
        },
      }),
      prisma.store.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const page = totalPages === 0 ? 1 : Math.min(requestedPage, totalPages);

    return NextResponse.json({ success: true, logs, stores, pagination: { page, pageSize, total, totalPages } });
  } catch (error) {
    console.error("GET super admin audit logs error:", error);
    return NextResponse.json({ error: "Failed to load audit logs." }, { status: 500 });
  }
}
