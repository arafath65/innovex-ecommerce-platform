
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getSession } from "@/lib/auth";
import CategoriesList from "./CategoriesList";

export default async function CategoriesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      userName={session.name}
      role={session.role}
    >
      <CategoriesList />
    </AdminShell>
  );
}