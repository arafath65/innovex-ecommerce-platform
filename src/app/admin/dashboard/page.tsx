import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  const storeName =
    session.storeName?.trim() || "Store";

  return (
    <AdminShell
      userName={session.name}
      role={session.role}
    >
      <div className="admin-page mx-auto max-w-[1440px]">
        <section className="mb-8 overflow-hidden rounded-[28px] border border-black/7 bg-[var(--admin-green)] text-white shadow-[0_28px_70px_rgba(23,75,57,0.16)]">
          <div className="admin-grid-bg relative p-6 sm:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
                <span className="size-1.5 rounded-full bg-emerald-300" />
                {storeName}
              </div>

              <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.035em] sm:text-4xl lg:text-[48px] lg:leading-[1.04]">
                A calmer way to run your store.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/66 sm:text-[15px]">
                Welcome back, {session.name}. Manage your catalog and storefront from one focused workspace.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/admin/products"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[12px] font-semibold text-[var(--admin-green)] transition hover:-translate-y-0.5 hover:bg-white/95"
              >
                Manage products
                <span aria-hidden>
                  →
                </span>
              </Link>

              <Link
                href={`/shop?store=${encodeURIComponent(session.storeSlug)}`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/7 px-4 py-3 text-[12px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                View storefront
                <span aria-hidden>
                  ↗
                </span>
              </Link>
            </div>
          </div>
        </section>

        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/34">
              Workspace
            </div>

            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-black/88">
              Store operations
            </h2>
          </div>

          <div className="hidden text-right sm:block">
            <div className="text-[10px] uppercase tracking-[0.18em] text-black/32">
              Access
            </div>

            <div className="mt-1 text-xs font-medium text-black/58">
              {session.role}
            </div>
          </div>
        </div>

        <section className="grid gap-4 xl:grid-cols-3">
          <Link
            href="/admin/products"
            className="dashboard-card admin-card admin-card-hover group rounded-[24px] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between">
              <div className="grid size-11 place-items-center rounded-2xl bg-[var(--admin-green-soft)] text-[var(--admin-green)]">
                <span className="text-lg">
                  ◈
                </span>
              </div>

              <span className="grid size-9 place-items-center rounded-xl bg-black/3 text-black/40 transition group-hover:translate-x-0.5 group-hover:text-[var(--admin-green)]">
                ↗
              </span>
            </div>

            <div className="mt-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/32">
                Catalog
              </div>

              <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.025em]">
                Products
              </h3>

              <p className="mt-2 max-w-sm text-[13px] leading-5 text-black/47">
                Add products, manage pricing, organize categories and maintain product images.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[12px] font-semibold text-[var(--admin-green)]">
              Open product manager
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/admin/categories"
            className="dashboard-card admin-card admin-card-hover group rounded-[24px] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#f1eadb] text-[#846738]">
                <span className="text-lg">
                  ▦
                </span>
              </div>

              <span className="grid size-9 place-items-center rounded-xl bg-black/3 text-black/40 transition group-hover:translate-x-0.5 group-hover:text-[#846738]">
                ↗
              </span>
            </div>

            <div className="mt-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/32">
                Structure
              </div>

              <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.025em]">
                Categories
              </h3>

              <p className="mt-2 max-w-sm text-[13px] leading-5 text-black/47">
                Build a clear catalog hierarchy so customers can find the right products faster.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-[12px] font-semibold text-[#846738]">
              Open category manager
              <span>→</span>
            </div>
          </Link>

          <div className="dashboard-card admin-card rounded-[24px] p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#e9e8ee] text-[#625f73]">
                <span className="text-lg">
                  □
                </span>
              </div>

              <span className="rounded-full border border-black/6 bg-black/2 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-black/32">
                Coming next
              </span>
            </div>

            <div className="mt-8">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/32">
                Operations
              </div>

              <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.025em]">
                Orders
              </h3>

              <p className="mt-2 max-w-sm text-[13px] leading-5 text-black/47">
                The next workspace will bring order review, status tracking and customer fulfillment together.
              </p>
            </div>

            <div className="mt-6 text-[12px] font-semibold text-black/35">
              Module not enabled yet
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="dashboard-card rounded-[24px] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/32">
                  Next step
                </div>

                <h3 className="mt-1.5 text-lg font-semibold tracking-[-0.02em]">
                  Polish the catalog experience
                </h3>
              </div>

              <div className="hidden size-11 place-items-center rounded-2xl bg-black/3 text-black/45 sm:grid">
                ✦
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {[
                "Review product imagery",
                "Keep category names consistent",
                "Use clear customer-facing pricing",
              ].map((item, index) => (
                <div
                  key={item}
                  className="rounded-2xl border border-black/6 bg-black/[0.02] p-4"
                >
                  <div className="text-[10px] font-semibold text-[var(--admin-green)]">
                    0{index + 1}
                  </div>

                  <p className="mt-2 text-[12px] leading-5 text-black/51">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card rounded-[24px] border border-black/7 bg-[var(--admin-green)] p-5 text-white sm:p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Storefront
            </div>

            <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em]">
              See the customer side
            </h3>

            <p className="mt-2 text-[12px] leading-5 text-white/58">
              Jump from the admin workspace straight into the storefront preview.
            </p>

            <Link
              href={`/shop?store=${encodeURIComponent(session.storeSlug)}`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[var(--admin-green)] transition hover:-translate-y-0.5"
            >
              Open storefront
              <span>↗</span>
            </Link>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}