import { NextResponse } from "next/server";

import { clearSuperAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearSuperAdminSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Super Admin logout error:", error);
    return NextResponse.json({ error: "Unable to sign out." }, { status: 500 });
  }
}
