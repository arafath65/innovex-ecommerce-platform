import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { STORE_CONFIG } from "@/config/store";
import { getSession } from "@/lib/auth";
import ProductEditClient from "./ProductEditClient";

type PageProps = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const session = await getSession();

  if (!session || session.storeSlug !== STORE_CONFIG.slug) {
    redirect("/admin/login");
  }

  const { productId: productIdText } = await params;
  const productId = Number(productIdText);

  if (!Number.isInteger(productId) || productId <= 0) {
    redirect("/admin/products");
  }

  return (
    <AdminShell userName={session.name} role={session.role}>
      <div className="admin-page">
        <ProductEditClient productId={productId} />
      </div>
    </AdminShell>
  );
}
