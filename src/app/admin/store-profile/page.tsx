
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getSession } from "@/lib/auth";
import StoreProfileClient from "./StoreProfileClient";

export default async function StoreProfilePage() {
  const session = await getSession();

  if (
    !session ||
    (session.role !== "OWNER" &&
      session.role !== "ADMIN")
  ) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      userName={session.name}
      role={session.role}
    >
      <StoreProfileClient />
    </AdminShell>
  );
}