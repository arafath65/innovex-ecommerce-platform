import "server-only";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type StorefrontResolution =
  | { kind: "platform"; hostname: string | null }
  | { kind: "store"; hostname: string | null; storeId: number; storeSlug: string }
  | { kind: "unmapped"; hostname: string | null };

export function normalizeHostname(value: string | null | undefined): string | null {
  if (!value) return null;

  let hostname = value.trim().toLowerCase();
  if (!hostname || hostname.length > 300) return null;

  // Host headers may include a port during local development.
  if (hostname.startsWith("[")) {
    const closingBracket = hostname.indexOf("]");
    if (closingBracket < 0) return null;
    hostname = hostname.slice(1, closingBracket);
  } else {
    hostname = hostname.replace(/:\d+$/, "");
  }

  hostname = hostname.replace(/\.$/, "");
  if (
    !hostname ||
    hostname.includes("/") ||
    hostname.includes("\\") ||
    hostname.includes(" ") ||
    hostname.includes("@")
  ) {
    return null;
  }

  return hostname;
}

function getPlatformHostnames(): Set<string> {
  const configured = (process.env.APP_BASE_DOMAINS ?? "")
    .split(",")
    .map((entry) => normalizeHostname(entry))
    .filter((entry): entry is string => Boolean(entry));

  const defaults =
    process.env.NODE_ENV === "production"
      ? ["innovexweb.lk", "www.innovexweb.lk", "admin.innovexweb.lk"]
      : ["innovexweb.test", "www.innovexweb.test", "admin.innovexweb.test"];

  return new Set([...defaults, ...configured]);
}

export function isPlatformHostname(hostname: string | null): boolean {
  return Boolean(hostname && getPlatformHostnames().has(hostname));
}

export async function resolveStorefrontForCurrentRequest(): Promise<StorefrontResolution> {
  const requestHeaders = await headers();
  const hostname = normalizeHostname(requestHeaders.get("host"));

  if (isPlatformHostname(hostname)) {
    return { kind: "platform", hostname };
  }

  if (hostname) {
    const domain = await prisma.store_domain.findUnique({
      where: { hostname },
      select: {
        status: true,
        store: {
          select: {
            id: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (domain?.status === "ACTIVE" && domain.store.isActive) {
      return {
        kind: "store",
        hostname,
        storeId: domain.store.id,
        storeSlug: domain.store.slug,
      };
    }
  }

  // Slug fallback is deliberately development-only. Production storefronts
  // must be reached through an active, verified hostname mapping.
  if (process.env.NODE_ENV !== "production") {
    const defaultSlug =
      process.env.STOREFRONT_STORE_SLUG?.trim().toLowerCase();

    if (defaultSlug && (!hostname || hostname === "localhost" || hostname === "127.0.0.1")) {
      const store = await prisma.store.findFirst({
        where: { slug: defaultSlug, isActive: true },
        select: { id: true, slug: true },
      });

      if (store) {
        return {
          kind: "store",
          hostname,
          storeId: store.id,
          storeSlug: store.slug,
        };
      }
    }
  }

  return { kind: "unmapped", hostname };
}

export function isStoreSlugPreviewAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_SLUG_STOREFRONT_PREVIEW === "true"
  );
}
