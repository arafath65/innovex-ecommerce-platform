import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

async function getAuthorizedStoreAdmin() {
  const session = await getSession();

  if (!session) {
    return { error: "Unauthorized", status: 401 as const };
  }

  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    return { error: "You do not have permission", status: 403 as const };
  }

  const store = await prisma.store.findFirst({
    where: {
      id: session.storeId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      template: true,
    },
  });

  if (!store) {
    return { error: "Store is inactive or not found", status: 403 as const };
  }

  return { session, store };
}

async function ensureConfiguration(storeId: number, storeName: string) {
  const [profile, settings, theme, store] = await Promise.all([
    prisma.store_profile.upsert({
      where: { storeId },
      create: { storeId, displayName: storeName },
      update: {},
    }),
    prisma.store_settings.upsert({
      where: { storeId },
      create: { storeId },
      update: {},
    }),
    prisma.store_theme.upsert({
      where: { storeId },
      create: { storeId },
      update: {},
    }),
    prisma.store.findUnique({
      where: { id: storeId },
      select: { template: true },
    }),
  ]);

  return { profile, settings, theme, template: store?.template ?? "MODERN" };
}

export async function GET() {
  try {
    const auth = await getAuthorizedStoreAdmin();

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const config = await ensureConfiguration(auth.store.id, auth.store.name);
    const heroSlides = await prisma.hero_slide.findMany({
      where: { storeId: auth.store.id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({
      success: true,
      store: auth.store,
      profile: config.profile,
      settings: config.settings,
      theme: config.theme,
      template: config.template,
      heroSlides,
    });
  } catch (error) {
    console.error("GET store profile error:", error);
    return NextResponse.json(
      { error: "Failed to load store profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getAuthorizedStoreAdmin();

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;
    const profile = (data.profile && typeof data.profile === "object"
      ? data.profile
      : {}) as Record<string, unknown>;
    const settings = (data.settings && typeof data.settings === "object"
      ? data.settings
      : {}) as Record<string, unknown>;
    const theme = (data.theme && typeof data.theme === "object"
      ? data.theme
      : {}) as Record<string, unknown>;

    const template = String(data.template ?? auth.store.template);
    const allowedTemplates = ["MODERN", "CLASSIC", "MINIMAL"];

    if (!allowedTemplates.includes(template)) {
      return NextResponse.json(
        { error: "Invalid storefront template" },
        { status: 400 },
      );
    }

    const heroOfferPercent = Number(settings.heroOfferPercent ?? 30);
    const freeDeliveryThreshold = Number(settings.freeDeliveryThreshold ?? 5000);
    const deliveryCharge = Number(settings.deliveryCharge ?? 0);
    const minimumOrder = Number(settings.minimumOrder ?? 0);

    if (
      !Number.isInteger(heroOfferPercent) ||
      heroOfferPercent < 0 ||
      heroOfferPercent > 100 ||
      !Number.isFinite(freeDeliveryThreshold) ||
      freeDeliveryThreshold < 0 ||
      !Number.isFinite(deliveryCharge) ||
      deliveryCharge < 0 ||
      !Number.isFinite(minimumOrder) ||
      minimumOrder < 0
    ) {
      return NextResponse.json(
        { error: "Invalid storefront numeric settings" },
        { status: 400 },
      );
    }

        const announcementMessage1 = String(
      settings.announcementMessage1 ?? "FREE DELIVERY ISLANDWIDE",
    )
      .trim()
      .slice(0, 180);

    const announcementMessage2 = String(
      settings.announcementMessage2 ?? "QUALITY KITCHEN ESSENTIALS",
    )
      .trim()
      .slice(0, 180);

    const announcementMessage3 = String(
      settings.announcementMessage3 ?? "A BETTER EVERYDAY KITCHEN",
    )
      .trim()
      .slice(0, 180);

    const result = await prisma.$transaction(async (tx) => {
      const updatedStore = await tx.store.update({
        where: { id: auth.store.id },
        data: {
          name: String(profile.businessName ?? auth.store.name).trim().slice(0, 150),
          currency: String(data.currency ?? auth.store.currency).trim().toUpperCase().slice(0, 3) || "LKR",
          template: template as "MODERN" | "CLASSIC" | "MINIMAL",
        },
        select: { id: true, name: true, slug: true, currency: true, template: true },
      });

      const updatedProfile = await tx.store_profile.upsert({
        where: { storeId: auth.store.id },
        create: {
          storeId: auth.store.id,
          displayName: String(profile.displayName ?? updatedStore.name).trim().slice(0, 150),
        },
        update: {},
      });

      const profileData = {
        displayName: String(profile.displayName ?? updatedProfile.displayName).trim().slice(0, 150),
        tagline: String(profile.tagline ?? "").trim() || null,
        description: String(profile.description ?? "").trim() || null,
        phone: String(profile.phone ?? "").trim() || null,
        whatsapp: String(profile.whatsapp ?? "").trim() || null,
        email: String(profile.email ?? "").trim().toLowerCase() || null,
        supportEmail: String(profile.supportEmail ?? "").trim().toLowerCase() || null,
        addressLine1: String(profile.addressLine1 ?? "").trim() || null,
        addressLine2: String(profile.addressLine2 ?? "").trim() || null,
        city: String(profile.city ?? "").trim() || null,
        district: String(profile.district ?? "").trim() || null,
        province: String(profile.province ?? "").trim() || null,
        postalCode: String(profile.postalCode ?? "").trim() || null,
        country: String(profile.country ?? "").trim() || null,
        facebookUrl: String(profile.facebookUrl ?? "").trim() || null,
        instagramUrl: String(profile.instagramUrl ?? "").trim() || null,
        tiktokUrl: String(profile.tiktokUrl ?? "").trim() || null,
        youtubeUrl: String(profile.youtubeUrl ?? "").trim() || null,
        aboutText: String(profile.aboutText ?? "").trim() || null,
        shippingPolicy: String(profile.shippingPolicy ?? "").trim() || null,
        returnsPolicy: String(profile.returnsPolicy ?? "").trim() || null,
        refundPolicy: String(profile.refundPolicy ?? "").trim() || null,
        privacyPolicy: String(profile.privacyPolicy ?? "").trim() || null,
        termsText: String(profile.termsText ?? "").trim() || null,
        faqText: String(profile.faqText ?? "").trim() || null,
      };

      const savedProfile = await tx.store_profile.update({
        where: { storeId: auth.store.id },
        data: profileData,
      });

      const savedSettings = await tx.store_settings.upsert({
        where: { storeId: auth.store.id },
        create: {
          storeId: auth.store.id,
          announcementMessage1,
          announcementMessage2,
          announcementMessage3,
          heroOfferPercent,
          freeDeliveryThreshold,
          deliveryCharge,
          minimumOrder,
          allowPickup: Boolean(settings.allowPickup),
          cashOnDelivery: settings.cashOnDelivery === undefined ? true : Boolean(settings.cashOnDelivery),
          bankTransfer: settings.bankTransfer === undefined ? true : Boolean(settings.bankTransfer),
          cardPayment: Boolean(settings.cardPayment),
          onlinePayment: Boolean(settings.onlinePayment),
          islandwideDelivery: settings.islandwideDelivery === undefined ? true : Boolean(settings.islandwideDelivery),
        },
        update: {
          announcementMessage1,
          announcementMessage2,
          announcementMessage3,
          heroOfferPercent,
          freeDeliveryThreshold,
          deliveryCharge,
          minimumOrder,
          allowPickup: Boolean(settings.allowPickup),
          cashOnDelivery: settings.cashOnDelivery === undefined ? true : Boolean(settings.cashOnDelivery),
          bankTransfer: settings.bankTransfer === undefined ? true : Boolean(settings.bankTransfer),
          cardPayment: Boolean(settings.cardPayment),
          onlinePayment: Boolean(settings.onlinePayment),
          islandwideDelivery: settings.islandwideDelivery === undefined ? true : Boolean(settings.islandwideDelivery),
        },
      });

      const savedTheme = await tx.store_theme.upsert({
        where: { storeId: auth.store.id },
        create: {
          storeId: auth.store.id,
          primaryColor: String(theme.primaryColor ?? "#d71920"),
          secondaryColor: String(theme.secondaryColor ?? "#111111"),
          accentColor: String(theme.accentColor ?? "#f59e0b"),
          backgroundColor: String(theme.backgroundColor ?? "#ffffff"),
          surfaceColor: String(theme.surfaceColor ?? "#f6f5f2"),
          textColor: String(theme.textColor ?? "#111111"),
          mutedColor: String(theme.mutedColor ?? "#6b7280"),
          headerStyle: String(theme.headerStyle ?? "CLASSIC"),
          buttonStyle: String(theme.buttonStyle ?? "ROUNDED"),
        },
        update: {
          primaryColor: String(theme.primaryColor ?? "#d71920"),
          secondaryColor: String(theme.secondaryColor ?? "#111111"),
          accentColor: String(theme.accentColor ?? "#f59e0b"),
          backgroundColor: String(theme.backgroundColor ?? "#ffffff"),
          surfaceColor: String(theme.surfaceColor ?? "#f6f5f2"),
          textColor: String(theme.textColor ?? "#111111"),
          mutedColor: String(theme.mutedColor ?? "#6b7280"),
          headerStyle: String(theme.headerStyle ?? "CLASSIC"),
          buttonStyle: String(theme.buttonStyle ?? "ROUNDED"),
        },
      });

      return { updatedStore, savedProfile, savedSettings, savedTheme };
    });

    await writeAuditLog({
      storeId: auth.store.id,
      storeUserId: auth.session.userId,
      actorType: "STORE_USER",
      module: "STORE_PROFILE",
      action: "UPDATE",
      entity: "STORE",
      entityId: auth.store.id,
      description: `${auth.session.name} updated storefront profile, settings and theme.`,
      metadata: { template, heroOfferPercent },
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({
      success: true,
      message: "Storefront settings saved successfully.",
      ...result,
    });
  } catch (error) {
    console.error("PATCH store profile error:", error);
    return NextResponse.json(
      { error: "Failed to save storefront settings" },
      { status: 500 },
    );
  }
}
