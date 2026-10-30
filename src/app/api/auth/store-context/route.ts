import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveStorefrontForCurrentRequest } from "@/lib/storefront-domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedSlug = searchParams.get("slug")?.trim().toLowerCase() ?? "";
    const resolution = await resolveStorefrontForCurrentRequest();

    // On a mapped tenant hostname, the Host-to-store mapping is authoritative.
    // A query-string slug must never switch the login context to another tenant.
    const canUseSlugContext = Boolean(requestedSlug) && (
      resolution.kind === "platform" || process.env.NODE_ENV !== "production"
    );

    const store = resolution.kind === "store"
      ? await prisma.store.findFirst({
          where: { id: resolution.storeId, isActive: true },
          select: {
            id: true, name: true, slug: true, logoUrl: true, primaryColor: true, currency: true,
            profile: { select: { displayName: true, logoUrl: true } },
            theme: { select: { primaryColor: true } },
          },
        })
      : canUseSlugContext
        ? await prisma.store.findFirst({
            where: { slug: requestedSlug, isActive: true },
            select: {
              id: true, name: true, slug: true, logoUrl: true, primaryColor: true, currency: true,
              profile: { select: { displayName: true, logoUrl: true } },
              theme: { select: { primaryColor: true } },
            },
          })
        : null;

    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found or this domain is not connected." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        store: {
          id: store.id,
          name: store.name,
          displayName: store.profile?.displayName ?? null,
          slug: store.slug,
          logoUrl: store.profile?.logoUrl ?? store.logoUrl ?? null,
          primaryColor: store.theme?.primaryColor ?? store.primaryColor ?? "#d71920",
          currency: store.currency,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Store context error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load store information." },
      { status: 500 },
    );
  }
}
