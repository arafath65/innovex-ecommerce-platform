import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

async function authorize() {
  const session = await getSession();

  if (!session) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const user = await prisma.store_user.findFirst({
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

function invalidId(value: number) {
  return !Number.isSafeInteger(value) || value <= 0;
}

async function makeUniqueSlug(
  storeId: number,
  name: string,
  excludeId?: number,
) {
  const baseSlug = makeSlug(name);

  if (!baseSlug) {
    throw new Error("Name cannot create a valid URL slug");
  }

  let slug = baseSlug;
  let suffix = 1;

  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        storeId,
        slug,
        ...(excludeId
          ? {
              NOT: { id: excludeId },
            }
          : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
}

export async function GET(request: Request) {
  try {
    const auth = await authorize();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const categories = await prisma.category.findMany({
      where: {
        storeId: auth.session.storeId,
        parentId: null,
        ...(new URL(request.url).searchParams.get("includeInactive") === "true"
          ? {}
          : { isActive: true }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        isActive: true,
        children: {
          where: {
            storeId: auth.session.storeId,
            ...(new URL(request.url).searchParams.get("includeInactive") === "true"
              ? {}
              : { isActive: true }),
          },
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            isActive: true,
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
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorize();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;
    const name =
      typeof data.name === "string" ? data.name.trim() : "";

    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: "Name is required (maximum 120 characters)" },
        { status: 400 },
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

      if (invalidId(parentId)) {
        return NextResponse.json(
          { error: "Invalid parent category" },
          { status: 400 },
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
          { status: 400 },
        );
      }
    }

    const slug = await makeUniqueSlug(
      auth.session.storeId,
      name,
    );

    const category = await prisma.category.create({
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
        isActive: true,
      },
    });

    return NextResponse.json(
      { message: "Category created successfully", category },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST categories error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create category",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;
    const id = Number(data.id);
    const action =
      typeof data.action === "string" ? data.action.trim().toLowerCase() : "";

    if (invalidId(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        id,
        storeId: auth.session.storeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        isActive: true,
        children: {
          where: { isActive: true },
          select: { id: true },
        },
        parent: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    if (action === "activate") {
      if (existing.isActive) {
        return NextResponse.json(
          { error: "Category is already active" },
          { status: 409 },
        );
      }

      if (existing.parentId !== null && !existing.parent?.isActive) {
        return NextResponse.json(
          {
            error:
              "Activate the main category first before activating this subcategory.",
          },
          { status: 409 },
        );
      }

      const category = await prisma.category.update({
        where: { id: existing.id },
        data: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          isActive: true,
        },
      });

      return NextResponse.json({
        message: "Category activated successfully",
        category,
      });
    }

    const name =
      typeof data.name === "string" ? data.name.trim() : "";

    if (!existing.isActive) {
      return NextResponse.json(
        {
          error:
            "Inactive categories cannot be edited. Activate the category first.",
        },
        { status: 409 },
      );
    }

    if (!name || name.length > 120) {
      return NextResponse.json(
        { error: "Name is required (maximum 120 characters)" },
        { status: 400 },
      );
    }

    const hasExplicitParent =
      Object.prototype.hasOwnProperty.call(data, "parentId");

    let parentId = existing.parentId;

    if (hasExplicitParent) {
      const rawParentId = data.parentId;

      if (
        rawParentId === null ||
        rawParentId === undefined ||
        rawParentId === ""
      ) {
        parentId = null;
      } else {
        const requestedParentId = Number(rawParentId);

        if (invalidId(requestedParentId) || requestedParentId === id) {
          return NextResponse.json(
            { error: "Invalid parent category" },
            { status: 400 },
          );
        }

        const parent = await prisma.category.findFirst({
          where: {
            id: requestedParentId,
            storeId: auth.session.storeId,
            parentId: null,
            isActive: true,
          },
          select: { id: true },
        });

        if (!parent) {
          return NextResponse.json(
            { error: "Select a valid main category" },
            { status: 400 },
          );
        }

        if (existing.children.length > 0 && existing.parentId === null) {
          return NextResponse.json(
            {
              error:
                "A main category with subcategories cannot be moved under another category. Edit the name only or move its subcategories first.",
            },
            { status: 409 },
          );
        }

        parentId = requestedParentId;
      }
    }

    const slug =
      name === existing.name
        ? existing.slug
        : await makeUniqueSlug(
            auth.session.storeId,
            name,
            existing.id,
          );

    const category = await prisma.category.update({
      where: { id: existing.id },
      data: {
        name,
        slug,
        ...(hasExplicitParent ? { parentId } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
      },
    });

    return NextResponse.json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("PATCH categories error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update category",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await authorize();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status },
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;
    const id = Number(data.id);
    const cascadeChildren = data.cascadeChildren === true;

    if (invalidId(id)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        id,
        storeId: auth.session.storeId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        isActive: true,
        children: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    if (!existing.isActive) {
      return NextResponse.json(
        { error: "Category is already inactive" },
        { status: 409 },
      );
    }

    if (
      existing.parentId === null &&
      existing.children.length > 0 &&
      !cascadeChildren
    ) {
      return NextResponse.json(
        {
          error:
            "This main category contains subcategories. Confirm that you want to deactivate it with its subcategories.",
          requiresCascadeConfirmation: true,
          category: {
            id: existing.id,
            name: existing.name,
          },
          children: existing.children.map((child) => ({
            id: child.id,
            name: child.name,
            isActive: child.isActive,
          })),
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: existing.id },
        data: { isActive: false },
      });

      if (existing.parentId === null && cascadeChildren) {
        await tx.category.updateMany({
          where: {
            storeId: auth.session.storeId,
            parentId: existing.id,
          },
          data: { isActive: false },
        });
      }
    });

    return NextResponse.json({
      message:
        existing.parentId === null && existing.children.length > 0
          ? "Category and subcategories deactivated successfully"
          : "Category deactivated successfully",
      id: existing.id,
      cascadeChildren:
        existing.parentId === null && existing.children.length > 0,
    });
  } catch (error) {
    console.error("DELETE categories error:", error);

    return NextResponse.json(
      { error: "Failed to deactivate category" },
      { status: 500 },
    );
  }
}
