
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

async function authorize() {
  const session = await getSession();

  if (!session) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const user = await prisma.storeUser.findFirst({
    where: {
      id: session.userId,
      storeId: session.storeId,
      isActive: true,
    },
    include: { store: { select: { isActive: true } } },
  });

  if (!user || !user.store.isActive) {
    return {
      error: "Account or store is inactive",
      status: 403 as const,
    };
  }

  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    return {
      error: "You do not have permission",
      status: 403 as const,
    };
  }

  return { session };
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

export async function GET() {
  try {
    const auth = await authorize();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const categories = await prisma.category.findMany({
      where: {
        storeId: auth.session.storeId,
        parentId: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        children: {
          where: {
            storeId: auth.session.storeId,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("GET categories error:", error);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const name =
      typeof data.name === "string" ? data.name.trim() : "";

    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: "Name is required (maximum 120 characters)" },
        { status: 400 }
      );
    }

    const rawParentId = data.parentId;
    let parentId: number | null = null;

    if (
      rawParentId !== undefined &&
      rawParentId !== null &&
      rawParentId !== ""
    ) {
      parentId = Number(rawParentId);

      if (!Number.isSafeInteger(parentId) || parentId <= 0) {
        return NextResponse.json(
          { error: "Invalid parent category" },
          { status: 400 }
        );
      }

      const parent = await prisma.category.findFirst({
        where: {
          id: parentId,
          storeId: auth.session.storeId,
          parentId: null,
          isActive: true,
        },
        select: { id: true },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "Select a valid main category" },
          { status: 400 }
        );
      }
    }

    const baseSlug = makeSlug(name);

    if (!baseSlug) {
      return NextResponse.json(
        { error: "Name cannot create a valid URL slug" },
        { status: 400 }
      );
    }

    const category = await prisma.$transaction(async (tx) => {
      let slug = baseSlug;
      let suffix = 1;

      while (
        await tx.category.findUnique({
          where: {
            storeId_slug: {
              storeId: auth.session.storeId,
              slug,
            },
          },
          select: { id: true },
        })
      ) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      return tx.category.create({
        data: {
          storeId: auth.session.storeId,
          parentId,
          name,
          slug,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
        },
      });
    });

    return NextResponse.json(
      { message: "Category created successfully", category },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST categories error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}