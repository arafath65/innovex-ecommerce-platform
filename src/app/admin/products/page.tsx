import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getSession } from "@/lib/auth";
import ProductsList from "./ProductsList";

export default async function ProductsPage() {
  const session = await getSession();

  // Store Admin access is based on the authenticated session.
  // Do NOT compare against STORE_CONFIG or a hardcoded store slug.
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      userName={session.name}
      role={session.role}
    >
      <ProductsList />
    </AdminShell>
  );
}