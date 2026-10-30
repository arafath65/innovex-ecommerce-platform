import { NextResponse } from "next/server";

import { exitSuperAdminStoreOverride, getSession } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.isImpersonating || !session.superAdminId) {
    return NextResponse.json({ error: "No Super Admin override is active." }, { status: 400 });
  }

  await writeAuditLog({
    storeId: session.storeId,
    superAdminId: session.superAdminId,
    actorType: "SUPER_ADMIN",
    module: "STORES",
    action: "OVERRIDE_EXIT",
    entity: "STORE",
    entityId: session.storeId,
    description: `Super Admin exited ${session.storeName} override mode.`,
    ...getRequestAuditContext(request),
  });

  await exitSuperAdminStoreOverride();

  return NextResponse.json({ success: true, redirectTo: "/super-admin/stores" });
}
