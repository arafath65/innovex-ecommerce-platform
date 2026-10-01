"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { StoreLogo } from "@/components/brand/StoreLogo";
import { STORE_CONFIG } from "@/config/store";

type TopbarProps = {
  name: string;
  role: string;
};

export default function Topbar({ name, role }: TopbarProps) {
  const scope = useRef<HTMLElement>(null);

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A";

  useGSAP(
    () => {
      gsap.from("[data-topbar-item]", {
        y: -10,
        opacity: 0,
        duration: 0.45,
        stagger: 0.06,
        ease: "power3.out",
      });
    },
    { scope },
  );

  return (
    <header
      ref={scope}
      className="flex min-h-[72px] items-center justify-between border-b border-black/[0.08] bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8"
    >
      <div data-topbar-item className="flex min-w-0 items-center gap-4 lg:hidden">
        <StoreLogo size="sm" showName />
      </div>

      <div data-topbar-item className="hidden min-w-0 lg:block">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/30">
          {STORE_CONFIG.name}
        </p>
        <p className="mt-1 text-[13px] font-semibold tracking-[-0.01em] text-[#171717]">
          Store administration
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2.5 sm:gap-3.5">
        <button
          data-topbar-item
          type="button"
          aria-label="Search"
          className="hidden h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-[#fafafa] text-black/43 transition hover:border-black/15 hover:text-[#111] sm:flex"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <circle cx="11" cy="11" r="5.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
            <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>

        <button
          data-topbar-item
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-[#fafafa] text-black/43 transition hover:border-black/15 hover:text-[#111]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d="M6.5 10.5a5.5 5.5 0 0 1 11 0c0 4 1.2 5.2 2 6H4.5c.8-.8 2-2 2-6ZM10 19h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute right-[6px] top-[6px] h-1.5 w-1.5 rounded-full bg-[#d71920]" />
        </button>

        <div data-topbar-item className="hidden h-7 w-px bg-black/[0.08] sm:block" />

        <div data-topbar-item className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] font-semibold text-[#161616]">{name}</p>
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.13em] text-black/33">
              {role}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#161616] text-[11px] font-bold text-white ring-1 ring-black/5">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
