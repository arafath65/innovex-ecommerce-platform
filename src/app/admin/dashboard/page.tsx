import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { STORE_CONFIG } from "@/config/store";
import { getSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session || session.storeSlug !== STORE_CONFIG.slug) {
    redirect("/admin/login");
  }

  const modules = [
    {
      label: "Catalog",
      title: "Products",
      text: "Manage products, prices and product images.",
      href: "/admin/products",
      accent: "red",
      icon: "◈",
      action: "Open products",
    },
    {
      label: "Structure",
      title: "Categories",
      text: "Keep your product catalog organized and easy to browse.",
      href: "/admin/categories",
      accent: "black",
      icon: "▦",
      action: "Open categories",
    },
    {
      label: "Operations",
      title: "Orders",
      text: "Review orders, track status and manage fulfillment.",
      href: undefined,
      accent: "muted",
      icon: "□",
      action: "Coming next",
    },
  ] as const;

  return (
    <AdminShell userName={session.name} role={session.role}>
      <div className="admin-page mx-auto max-w-[1180px]">
        <section className="dashboard-card relative overflow-hidden rounded-[20px] border border-black/7 bg-[#111111] text-white shadow-[0_18px_45px_rgba(0,0,0,0.10)]">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-[#d71920]/18 blur-[70px]" />
          <div className="absolute -bottom-28 left-1/3 size-56 rounded-full bg-white/[0.035] blur-[55px]" />

          <div className="relative grid gap-6 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
                <span className="size-1.5 rounded-full bg-[#d71920]" />
                Store overview
              </div>

              <h1 className="text-[30px] font-semibold tracking-[-0.045em] sm:text-[34px] sm:leading-[1.05]">
                Welcome back, {session.name}.
              </h1>

              <p className="mt-2 max-w-2xl text-[12px] leading-5 text-white/50 sm:text-[13px]">
                Your {STORE_CONFIG.name} workspace is ready. Manage the catalog now and expand into orders and customer tools as the platform grows.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/products"
                className="inline-flex items-center gap-2 rounded-xl bg-[#d71920] px-3.5 py-2.5 text-[11px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#bd1118]"
              >
                Add a product
                <span>→</span>
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-[11px] font-semibold text-white/85 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09]"
              >
                View store
                <span>↗</span>
              </Link>
            </div>
          </div>
        </section>

        <div className="dashboard-card mt-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/30">
              Workspace
            </div>
            <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-black/88">
              Store modules
            </h2>
          </div>

          <div className="hidden text-right sm:block">
            <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/25">
              Access
            </div>
            <div className="mt-1 text-[11px] font-medium text-black/55">
              {session.role}
            </div>
          </div>
        </div>

        <section className="mt-3 grid gap-3 lg:grid-cols-3">
          {modules.map((module) => {
            const cardClass =
              module.href
                ? "dashboard-card group rounded-[18px] border border-black/7 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.035)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.07)]"
                : "dashboard-card rounded-[18px] border border-black/7 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.035)]";

            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`grid size-9 place-items-center rounded-xl text-[15px] font-semibold ${
                      module.accent === "red"
                        ? "bg-[#d71920]/9 text-[#d71920]"
                        : module.accent === "black"
                          ? "bg-black/[0.045] text-black/70"
                          : "bg-black/[0.035] text-black/30"
                    }`}
                  >
                    {module.icon}
                  </div>

                  <span
                    className={`grid size-8 place-items-center rounded-lg text-black/28 transition ${
                      module.href
                        ? "bg-black/[0.03] group-hover:translate-x-0.5 group-hover:text-[#d71920]"
                        : "bg-black/[0.02]"
                    }`}
                  >
                    {module.href ? "↗" : "—"}
                  </span>
                </div>

                <div className="mt-5">
                  <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/28">
                    {module.label}
                  </div>
                  <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.025em]">
                    {module.title}
                  </h3>
                  <p className="mt-1.5 max-w-[290px] text-[11px] leading-5 text-black/45">
                    {module.text}
                  </p>
                </div>

                <div
                  className={`mt-4 flex items-center gap-1.5 text-[10px] font-semibold ${
                    module.href ? "text-[#d71920]" : "text-black/28"
                  }`}
                >
                  {module.action}
                  {module.href ? <span>→</span> : null}
                </div>
              </>
            );

            return module.href ? (
              <Link key={module.title} href={module.href} className={cardClass}>
                {inner}
              </Link>
            ) : (
              <div key={module.title} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-[1.55fr_0.95fr]">
          <div className="dashboard-card rounded-[18px] border border-black/7 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.035)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/28">
                  Quick access
                </div>
                <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.025em]">
                  Keep the catalog clean
                </h3>
              </div>
              <span className="hidden size-8 place-items-center rounded-lg bg-black/[0.035] text-black/40 sm:grid">
                ✦
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                "Add clear product photos",
                "Keep category names consistent",
                "Use customer-facing prices",
              ].map((item, index) => (
                <div
                  key={item}
                  className="rounded-xl border border-black/6 bg-black/[0.018] px-3 py-2.5"
                >
                  <div className="text-[8px] font-semibold text-[#d71920]">
                    0{index + 1}
                  </div>
                  <p className="mt-1 text-[10px] leading-4 text-black/48">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-card rounded-[18px] border border-black/7 bg-[#d71920] p-4 text-white shadow-[0_12px_30px_rgba(215,25,32,0.15)]">
            <div className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Storefront
            </div>
            <h3 className="mt-1.5 text-[17px] font-semibold tracking-[-0.025em]">
              Check the customer view
            </h3>
            <p className="mt-1.5 text-[10px] leading-4.5 text-white/65">
              Make sure your catalog presentation feels as polished as the admin workspace.
            </p>
            <Link
              href="/shop"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[10px] font-semibold text-[#111111] transition duration-300 hover:-translate-y-0.5"
            >
              Open storefront <span>↗</span>
            </Link>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
