
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
    });
  } catch (error) {
    console.error("Database connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 },
    );
  }
}