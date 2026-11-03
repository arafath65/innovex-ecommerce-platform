import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getSession } from "@/lib/auth";
import HomepageEditorialClient from "./HomepageEditorialClient";

export default async function HomepagePage() {
  const session = await getSession();

  if (!session || (session.role !== "OWNER" && session.role !== "ADMIN")) {
    redirect("/admin/login");
  }

  return (
    <AdminShell userName={session.name} role={session.role}>
      <HomepageEditorialClient />
    </AdminShell>
  );
}
