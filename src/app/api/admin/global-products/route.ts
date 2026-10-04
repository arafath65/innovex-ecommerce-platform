import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeBarcode(value: unknown): string {
  return String(value ?? "").trim();
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.storeSlug !== "oscar-trading") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const barcode = normalizeBarcode(searchParams.get("barcode"));

    if (!barcode) {
      return NextResponse.json(
        {
          success: false,
          message: "Barcode is required.",
        },
        { status: 400 }
      );
    }

    if (barcode.length > 50) {
      return NextResponse.json(
        {
          success: false,
          message: "Barcode cannot exceed 50 characters.",
        },
        { status: 400 }
      );
    }

    const globalProduct = await prisma.global_product.findUnique({
      where: {
        barcode,
      },
      select: {
        id: true,
        barcode: true,
        brand: true,
        name: true,
        shortDescription: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      found: Boolean(globalProduct),
      globalProduct,
    });
  } catch (error) {
    console.error("Global product lookup error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to search global product catalog.",
      },
      { status: 500 }
    );
  }
}