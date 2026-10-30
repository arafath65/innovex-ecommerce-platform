import { redirect } from "next/navigation";

import SuperAdminShell from "@/components/super-admin/SuperAdminShell";
import { getSuperAdminSession } from "@/lib/auth";
import StoreDetailsClient from "./StoreDetailsClient";

export default async function SuperAdminStoreDetailsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect("/super-admin/login");
  }

  return (
    <SuperAdminShell adminName={session.name}>
      <StoreDetailsClient />
    </SuperAdminShell>
  );
}
