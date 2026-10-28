
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type IconName =
  | "dashboard"
  | "products"
  | "categories"
  | "orders"
  | "customers"
  | "settings"
  | "store"
  | "menu"
  | "search"
  | "bell"
  | "arrow"
  | "spark";

type StoreBranding = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  currency: string;
  isActive: boolean;
  profile: {
    displayName: string | null;
    logoUrl: string | null;
  } | null;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    mutedColor: string;
  } | null;
};

const navItems: Array<{
  label: string;
  href?: string;
  icon: IconName;
  soon?: boolean;
}> = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "dashboard",
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: "products",
  },
  {
    label: "Categories",
    href: "/admin/categories",
    icon: "categories",
  },
  {
    label: "Orders",
    icon: "orders",
    soon: true,
  },
  {
    label: "Customers",
    icon: "customers",
    soon: true,
  },
];

const secondaryItems: Array<{
  label: string;
  href: string;
  icon: IconName;
}> = [
  {
    label: "Store Profile",
    href: "/admin/store-profile",
    icon: "store",
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "settings",
  },
];

function Icon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.4" />
          <rect x="14" y="3" width="7" height="7" rx="1.4" />
          <rect x="3" y="14" width="7" height="7" rx="1.4" />
          <rect x="14" y="14" width="7" height="7" rx="1.4" />
        </svg>
      );

    case "products":
      return (
        <svg {...common}>
          <path d="m7 4 5-2 5 2 3 5-8 4-8-4 3-5Z" />
          <path d="M4 9v8l8 5 8-5V9" />
          <path d="M12 13v9" />
        </svg>
      );

    case "categories":
      return (
        <svg {...common}>
          <path d="M4 5h6v6H4zM14 5h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
        </svg>
      );

    case "orders":
      return (
        <svg {...common}>
          <path d="M5 3h14v18H5z" />
          <path d="M8 7h8M8 11h8M8 15h5" />
        </svg>
      );

    case "customers":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M6 20c.7-3.1 2.7-5 6-5s5.3 1.9 6 5" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );

    case "store":
      return (
        <svg {...common}>
          <path d="M4 10v10h16V10" />
          <path d="M3 10 5 4h14l2 6" />
          <path d="M8 20v-6h8v6" />
          <path d="M7 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" />
          <path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z" />
        </svg>
      );

    default:
      return null;
  }
}

function normalizeHex(
  value: string | null | undefined,
  fallback: string,
) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return trimmed;
  }

  return fallback;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");

  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function createSoftColor(
  hex: string,
  alpha = 0.14,
) {
  try {
    const { r, g, b } = hexToRgb(hex);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return "rgba(255,255,255,0.08)";
  }
}

function getInitials(name: string) {
  const cleaned = name.trim();

  if (!cleaned) {
    return "S";
  }

  const words = cleaned.split(/\s+/);

  if (words.length === 1) {
    return words[0]
      .slice(0, 1)
      .toUpperCase();
  }

  return `${words[0]
    .slice(0, 1)}${words[words.length - 1]
    .slice(0, 1)}`.toUpperCase();
}

export function AdminShell({
  children,
  userName,
  role,
}: {
  children: ReactNode;
  userName: string;
  role: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [store, setStore] =
    useState<StoreBranding | null>(null);

  const [storeLoading, setStoreLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStore() {
      try {
        const response = await fetch(
          "/api/auth/current-store",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load store branding.",
          );
        }

        const data =
          (await response.json()) as {
            success?: boolean;
            store?: StoreBranding;
          };

        if (
          !cancelled &&
          data.store
        ) {
          setStore(data.store);
        }
      } catch (error) {
        console.error(
          "Store branding load error:",
          error,
        );
      } finally {
        if (!cancelled) {
          setStoreLoading(false);
        }
      }
    }

    void loadStore();

    return () => {
      cancelled = true;
    };
  }, []);

  useGSAP(
    () => {
      const intro = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      intro
        .from(".admin-sidebar", {
          x: -22,
          opacity: 0,
          duration: 0.55,
        })
        .from(
          ".admin-topbar",
          {
            y: -14,
            opacity: 0,
            duration: 0.42,
          },
          "-=0.28",
        )
        .from(
          ".admin-page",
          {
            y: 18,
            opacity: 0,
            duration: 0.55,
          },
          "-=0.24",
        )
        .from(
          ".dashboard-card",
          {
            y: 14,
            opacity: 0,
            duration: 0.42,
            stagger: 0.07,
          },
          "-=0.3",
        );
    },
    {
      scope: root,
    },
  );

  const isActive = (
    href?: string,
  ) => {
    if (!href) {
      return false;
    }

    if (
      href ===
      "/admin/dashboard"
    ) {
      return pathname === href;
    }

    return pathname.startsWith(href);
  };

  const primaryColor =
    normalizeHex(
      store?.theme?.primaryColor ||
        store?.primaryColor,
      "#d71920",
    );

  const secondaryColor =
    normalizeHex(
      store?.theme?.secondaryColor,
      "#111111",
    );

  const accentColor =
    normalizeHex(
      store?.theme?.accentColor,
      "#f5c542",
    );

  const backgroundColor =
    normalizeHex(
      store?.theme?.backgroundColor,
      "#f6f5f1",
    );

  const surfaceColor =
    normalizeHex(
      store?.theme?.surfaceColor,
      "#ffffff",
    );

  const textColor =
    normalizeHex(
      store?.theme?.textColor,
      "#18211d",
    );

  const mutedColor =
    normalizeHex(
      store?.theme?.mutedColor,
      "#6e756f",
    );

  const softPrimaryColor =
    createSoftColor(
      primaryColor,
      0.14,
    );

  const storeDisplayName =
    store?.profile?.displayName?.trim() ||
    store?.name ||
    "Store";

  const storeLogo =
    store?.profile?.logoUrl?.trim() ||
    store?.logoUrl?.trim() ||
    "";

  const storeInitials =
    getInitials(storeDisplayName);

  const storefrontUrl = store?.slug
    ? `/shop?store=${encodeURIComponent(
        store.slug,
      )}`
    : "/shop";

  const connectedGreen =
    "#22c55e";

  const connectedGreenSoft =
    "rgba(34,197,94,0.10)";

  const connectedGreenBorder =
    "rgba(34,197,94,0.24)";

  const cssVariables = {
    "--admin-bg":
      backgroundColor,
    "--admin-sidebar":
      "#090909",
    "--admin-surface":
      surfaceColor,
    "--admin-ink": textColor,
    "--admin-muted":
      mutedColor,
    "--admin-green":
      primaryColor,
    "--admin-green-2":
      secondaryColor,
    "--admin-green-soft":
      softPrimaryColor,
    "--admin-line":
      "rgba(0,0,0,0.08)",
    "--admin-accent":
      accentColor,
  } as CSSProperties;

  return (
    <div
      ref={root}
      style={cssVariables}
      className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-ink)]"
    >
      {/* MOBILE OVERLAY */}
      <div
        className={`fixed inset-0 z-30 bg-black/55 backdrop-blur-[2px] transition-opacity lg:hidden ${
          mobileOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() =>
          setMobileOpen(false)
        }
        aria-hidden={!mobileOpen}
      />

      {/* SIDEBAR */}
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col overflow-y-auto border-r border-white/10 bg-[#090909] px-4 py-5 text-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
        style={{
          scrollbarColor:
            "rgba(255,255,255,0.18) transparent",
          scrollbarWidth: "thin",
        }}
      >
        {/* BRAND */}
        <div className="flex shrink-0 items-center gap-3 px-3 pb-6">
          {storeLogo ? (
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
  <Image
    src={storeLogo}
    alt={storeDisplayName}
    width={40}
    height={40}
    unoptimized
    className="h-full w-full object-contain p-1.5"
  />
</div>
          ) : (
            <div
              className="grid size-10 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
              style={{
                backgroundColor:
                  primaryColor,
              }}
            >
              {storeInitials.slice(
                0,
                2,
              )}
            </div>
          )}

          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white">
              {storeDisplayName}
            </div>

            <div className="truncate text-[10px] uppercase tracking-[0.18em] text-white/35">
              {store?.slug ||
                "Store"}
            </div>
          </div>
        </div>

        {/* CONNECTION STATUS */}
        <div
          className="mb-5 shrink-0 rounded-2xl border px-3 py-2.5"
          style={{
            backgroundColor:
              connectedGreenSoft,
            borderColor:
              connectedGreenBorder,
          }}
        >
          <div
            className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{
              color:
                connectedGreen,
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                backgroundColor:
                  connectedGreen,
              }}
            />

            {storeLoading
              ? "Connecting"
              : "Store connected"}
          </div>
        </div>

        {/* WORKSPACE */}
        <div className="shrink-0 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Workspace
        </div>

        <nav className="shrink-0 space-y-1.5">
          {navItems.map((item) => {
            const active =
              isActive(item.href);

            if (item.soon) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl px-3.5 py-3 text-[13px] text-white/35"
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      name={item.icon}
                      size={17}
                    />

                    {item.label}
                  </span>

                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/40">
                    Soon
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                onClick={() =>
                  setMobileOpen(false)
                }
                className={`group flex items-center justify-between rounded-2xl px-3.5 py-3 text-[13px] transition-all duration-200 ${
                  active
                    ? "text-white shadow-[0_10px_22px_rgba(0,0,0,0.22)]"
                    : "text-white/60 hover:bg-white/7 hover:text-white"
                }`}
                style={
                  active
                    ? {
                        backgroundColor:
                          primaryColor,
                      }
                    : undefined
                }
              >
                <span className="flex items-center gap-3">
                  <Icon
                    name={item.icon}
                    size={17}
                  />

                  {item.label}
                </span>

                {active && (
                  <Icon
                    name="arrow"
                    size={15}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* STORE */}
        <div className="mt-7 shrink-0 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Store
        </div>

        <Link
          href={storefrontUrl}
          onClick={() =>
            setMobileOpen(false)
          }
          className="group flex shrink-0 items-center justify-between rounded-2xl px-3.5 py-3 text-[13px] text-white/60 transition hover:bg-white/7 hover:text-white"
        >
          <span className="flex items-center gap-3">
            <Icon
              name="store"
              size={17}
            />
            View storefront
          </span>

          <Icon
            name="arrow"
            size={15}
          />
        </Link>

        {/* SETTINGS */}
        <div className="mt-7 shrink-0">
  {secondaryItems.map((item) => {
    const active = isActive(item.href);

    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`group flex items-center justify-between rounded-2xl px-3.5 py-3 text-[13px] transition-all duration-200 ${
          active
            ? "text-white shadow-[0_10px_22px_rgba(0,0,0,0.22)]"
            : "text-white/60 hover:bg-white/7 hover:text-white"
        }`}
        style={
          active
            ? {
                backgroundColor: primaryColor,
              }
            : undefined
        }
      >
        <span className="flex items-center gap-3">
          <Icon
            name={item.icon}
            size={17}
          />

          {item.label}
        </span>

        {active && (
          <Icon
            name="arrow"
            size={15}
          />
        )}
      </Link>
    );
  })}
</div>
      </aside>

      {/* MAIN */}
      <div className="lg:pl-[264px]">
        {/* TOP BAR */}
        <header className="admin-topbar sticky top-0 z-20 border-b border-black/6 bg-[color:rgba(247,246,242,0.88)] backdrop-blur-xl">
          <div className="flex h-[76px] items-center justify-between px-5 sm:px-7 lg:px-9">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="grid size-10 place-items-center rounded-2xl border border-black/7 bg-white/75 text-black/60 transition hover:text-black lg:hidden"
                onClick={() =>
                  setMobileOpen(true)
                }
                aria-label="Open navigation"
              >
                <Icon
                  name="menu"
                  size={19}
                />
              </button>

              <div className="hidden items-center gap-2 rounded-2xl border border-black/7 bg-white/70 px-3.5 py-2.5 sm:flex">
                <Icon
                  name="search"
                  size={16}
                />

                <span className="text-[12px] text-black/35">
                  Search products, categories...
                </span>

                <kbd className="ml-6 rounded-lg border border-black/7 px-1.5 py-0.5 text-[9px] text-black/32">
                  ⌘ K
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                className="grid size-10 place-items-center rounded-2xl border border-black/7 bg-white/75 text-black/56 transition hover:-translate-y-0.5 hover:text-black"
                aria-label="Notifications"
              >
                <Icon
                  name="bell"
                  size={17}
                />
              </button>

              <div className="hidden h-8 w-px bg-black/7 sm:block" />

              <div className="flex items-center gap-2.5 rounded-2xl border border-black/7 bg-white/75 px-2.5 py-1.5">
                <div
                  className="grid size-8 place-items-center rounded-xl text-[11px] font-bold"
                  style={{
                    backgroundColor:
                      softPrimaryColor,
                    color:
                      primaryColor,
                  }}
                >
                  {getInitials(
                    userName,
                  ).slice(0, 2)}
                </div>

                <div className="hidden pr-1 sm:block">
                  <div className="max-w-[160px] truncate text-[12px] font-semibold text-black/78">
                    {userName}
                  </div>

                  <div className="text-[10px] uppercase tracking-[0.12em] text-black/34">
                    {role}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE */}
        <main className="admin-page px-5 py-7 sm:px-7 lg:px-9 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
