import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import AuditLogsClient from "./AuditLogsClient";

export default async function AuditLogsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell userName={session.name} role={session.role}>
      <AuditLogsClient />
    </AdminShell>
  );
}
