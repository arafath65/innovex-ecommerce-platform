
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  // This setup endpoint is only for local development.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, message: "Not available." },
      { status: 404 },
    );
  }

  try {
    const existingStore = await prisma.store.findUnique({
      where: { slug: "oscar-trading" },
    });

    if (existingStore) {
      return NextResponse.json({
        success: true,
        message: "Oscar Trading already exists.",
        store: existingStore,
      });
    }

    const store = await prisma.store.create({
      data: {
        name: "Oscar Trading",
        slug: "oscar-trading",
        description: "Oscar Trading online store",
        currency: "LKR",
        template: "MODERN",
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Oscar Trading store created successfully.",
      store,
    });
  } catch (error) {
    console.error("Store setup failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not create the store.",
      },
      { status: 500 },
    );
  }
}