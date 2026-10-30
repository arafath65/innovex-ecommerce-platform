import { redirect } from "next/navigation";

import SuperAdminShell from "@/components/super-admin/SuperAdminShell";
import { getSuperAdminSession } from "@/lib/auth";
import AuditLogsClient from "./AuditLogsClient";

export default async function SuperAdminAuditLogsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect("/super-admin/login");
  }

  return (
    <SuperAdminShell adminName={session.name}>
      <AuditLogsClient />
    </SuperAdminShell>
  );
}
