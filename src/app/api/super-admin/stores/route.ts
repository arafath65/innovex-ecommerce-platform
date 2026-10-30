import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

function makeSlug(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return base || "store";
}

async function uniqueSlug(name: string) {
  const base = makeSlug(name);
  let slug = base;
  let suffix = 1;

  while (await prisma.store.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status") ?? "ALL";

    const stores = await prisma.store.findMany({
      where: {
        ...(status === "ACTIVE"
          ? { isActive: true }
          : status === "INACTIVE"
            ? { isActive: false }
            : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { slug: { contains: search } },
              ],
            }
          : {}),
      },
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
        
users: {
  where: {
    role: "OWNER",
  },
  orderBy: {
    createdAt: "asc",
  },
  take: 1,
  select: {
    id: true,
    name: true,
    username: true,
    email: true,
    role: true,
    isActive: true,
  },
},

      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, stores });
  } catch (error) {
    console.error("GET super admin stores error:", error);
    return NextResponse.json({ error: "Failed to load stores." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const name = String(body.storeName ?? "").trim();
    const displayName = String(body.displayName ?? name).trim();
    const adminName = String(body.adminName ?? displayName).trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const currency =
      String(body.currency ?? "LKR").trim().toUpperCase().slice(0, 3) || "LKR";

    if (
      !name ||
      !displayName ||
      !adminName ||
      !username ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        { error: "Store, administrator and login details are required." },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9._-]{3,100}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-100 characters and contain only letters, numbers, dots, underscores or hyphens.",
        },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.store_user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username or email is already in use." },
        { status: 409 },
      );
    }

    const slug = await uniqueSlug(name);
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name,
          slug,
          currency,
          isActive: true,
          profile: {
            create: {
              businessName: name,
              displayName,
            },
          },
          settings: { create: {} },
          theme: { create: {} },
        },
      });

      const user = await tx.store_user.create({
        data: {
          storeId: store.id,
          username,
          name: adminName.slice(0, 150),
          email,
          passwordHash,
          role: "OWNER",
          isActive: true,
        },
      });

      return { store, user };
    });

    await writeAuditLog({
      storeId: result.store.id,
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "STORES",
      action: "CREATE",
      entity: "STORE",
      entityId: result.store.id,
      description: `${auth.session.name} created store ${result.store.name}.`,
      metadata: {
        slug: result.store.slug,
        username,
      },
      ...getRequestAuditContext(request),
    });

    return NextResponse.json(
      {
        success: true,
        store: {
          id: result.store.id,
          name: result.store.name,
          slug: result.store.slug,
          currency: result.store.currency,
          isActive: result.store.isActive,
          user: {
            id: result.user.id,
            name: result.user.name,
            username: result.user.username,
            email: result.user.email,
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST super admin stores error:", error);
    return NextResponse.json({ error: "Failed to create store." }, { status: 500 });
  }
}
