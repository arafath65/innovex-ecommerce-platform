import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { STORE_CONFIG } from "@/config/store";
import { getSession } from "@/lib/auth";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getSession();

  if (
    !session ||
    session.storeSlug !== STORE_CONFIG.slug ||
    (session.role !== "OWNER" && session.role !== "ADMIN")
  ) {
    redirect("/admin/login");
  }

  return (
    <AdminShell userName={session.name} role={session.role}>
      <SettingsClient />
    </AdminShell>
  );
}
