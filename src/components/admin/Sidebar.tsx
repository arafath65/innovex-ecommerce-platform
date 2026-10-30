"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { StoreLogo } from "@/components/brand/StoreLogo";
import { STORE_CONFIG } from "@/config/store";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/admin/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="4" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="4" y="14" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="14" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" aria-hidden="true">
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="m4.5 7.6 7.5 4 7.5-4M12 11.6V21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="4" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="4" y="14" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="14" y="14" width="6" height="6" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-sidebar-item]", {
        x: -18,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: "power3.out",
        delay: 0.12,
      });
    },
    { scope },
  );

  return (
    <aside
      ref={scope}
      className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-black/[0.08] bg-[#111111] px-4 py-5 text-white lg:flex"
    >
      <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.035] p-4">
        <StoreLogo showName size="sm" />
        <div className="mt-4 border-t border-white/[0.08] pt-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/32">
          Store administration
        </div>
      </div>

      <div className="mt-9 px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/28">
        Workspace
      </div>

      <nav className="mt-3 space-y-1" aria-label="Admin navigation">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              data-sidebar-item
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-[13px] px-3.5 py-3 text-[12px] font-semibold transition-all duration-200 ${
                active
                  ? "bg-[#d71920] text-white shadow-[0_10px_28px_rgba(215,25,32,0.23)]"
                  : "text-white/47 hover:bg-white/[0.06] hover:text-white/85"
              }`}
            >
              <span
                className={`transition-colors ${
                  active ? "text-white" : "text-white/38 group-hover:text-white/80"
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {active ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/90" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-white/28">
                Store
              </p>
              <p className="mt-1 text-[12px] font-semibold text-white/85">
                {STORE_CONFIG.name}
              </p>
            </div>
            <span className="h-2 w-2 rounded-full bg-[#48bd7f] shadow-[0_0_0_5px_rgba(72,189,127,0.10)]" />
          </div>
          <p className="mt-2 text-[10px] leading-5 text-white/35">
            Commerce workspace is ready.
          </p>
        </div>
      </div>
    </aside>
  );
}
