import { redirect } from "next/navigation";

import SuperAdminShell from "@/components/super-admin/SuperAdminShell";
import { getSuperAdminSession } from "@/lib/auth";
import AccountClient from "./AccountClient";

export default async function SuperAdminAccountPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect("/super-admin/login");
  }

  return (
    <SuperAdminShell adminName={session.name}>
      <AccountClient />
    </SuperAdminShell>
  );
}
