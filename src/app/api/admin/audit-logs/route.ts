import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") ?? "50", 10) || 50;
  const pageSize = [25, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 50;
  const search = searchParams.get("search")?.trim() ?? "";

  const where = {
    storeId: session.storeId,
    ...(search
      ? {
          OR: [
            { module: { contains: search } },
            { action: { contains: search } },
            { description: { contains: search } },
            { entity: { contains: search } },
            { entityId: { contains: search } },
          ],
        }
      : {}),
  };

  const total = await prisma.audit_log.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const logs = await prisma.audit_log.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    include: {
      storeUser: { select: { name: true, username: true, role: true } },
      superAdmin: { select: { name: true, username: true } },
    },
  });

  return NextResponse.json({
    success: true,
    logs,
    pagination: { page: currentPage, pageSize, total, totalPages },
  });
}
