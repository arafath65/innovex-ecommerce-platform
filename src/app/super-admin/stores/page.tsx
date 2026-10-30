import { redirect } from "next/navigation";

import SuperAdminShell from "@/components/super-admin/SuperAdminShell";
import { getSuperAdminSession } from "@/lib/auth";
import StoresClient from "./StoresClient";

export default async function SuperAdminStoresPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect("/super-admin/login");
  }

  return (
    <SuperAdminShell adminName={session.name}>
      <StoresClient />
    </SuperAdminShell>
  );
}
