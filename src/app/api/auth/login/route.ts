
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const storeSlug =
      typeof body.storeSlug === "string"
        ? body.storeSlug.trim().toLowerCase()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!storeSlug || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Please enter all login details." },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: { slug: storeSlug },
      select: {
        id: true,
        slug: true,
        isActive: true,
      },
    });

    if (!store || !store.isActive) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const user = await prisma.storeUser.findUnique({
      where: {
        storeId_email: {
          storeId: store.id,
          email,
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 },
      );
    }

    await createSession({
      userId: user.id,
      storeId: store.id,
      storeSlug: store.slug,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeSlug: store.slug,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}