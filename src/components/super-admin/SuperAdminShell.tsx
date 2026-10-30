"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, FileClock, LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/super-admin/stores", label: "Stores", icon: Building2 },
  { href: "/super-admin/audit-logs", label: "Audit Logs", icon: FileClock },
  { href: "/super-admin/account", label: "My Account", icon: UserCircle },
];

export default function SuperAdminShell({
  children,
  adminName,
}: {
  children: ReactNode;
  adminName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/super-admin/logout", { method: "POST" });
    } finally {
      router.push("/super-admin/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0] text-[#111111]">
      <header className="sticky top-0 z-30 border-b border-black/7 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-10">
          <Link href="/super-admin/stores" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#111111] text-white shadow-sm">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-black tracking-[-0.02em]">Innovex Platform</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/35">Super Admin</p>
            </div>
          </Link>

          <div className="hidden items-center gap-1 rounded-2xl border border-black/7 bg-[#faf9f6] p-1 md:flex">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition ${
                    active
                      ? "bg-[#111111] text-white"
                      : "text-black/45 hover:bg-white hover:text-black"
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/30">Signed in as</p>
              <p className="mt-0.5 text-xs font-bold">{adminName}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-white px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-black/50 transition hover:border-red-200 hover:bg-red-50 hover:text-[#d71920] disabled:opacity-50"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">{loggingOut ? "Signing out" : "Sign out"}</span>
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-5 pb-3 md:hidden sm:px-8">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] ${
                  active ? "bg-[#111111] text-white" : "bg-[#faf9f6] text-black/45"
                }`}
              >
                <Icon size={13} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {children}
    </div>
  );
}
