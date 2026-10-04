import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { STORE_CONFIG } from "@/config/store";
import { getSession } from "@/lib/auth";
import ProductsList from "./ProductsList";

export default async function ProductsPage() {
  const session = await getSession();

  if (!session || session.storeSlug !== STORE_CONFIG.slug) {
    redirect("/admin/login");
  }

  return (
    <AdminShell userName={session.name} role={session.role}>
      <ProductsList />
    </AdminShell>
  );
}