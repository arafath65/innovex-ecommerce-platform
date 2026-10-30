import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";
import { isPlatformHostname, normalizeHostname } from "@/lib/storefront-domain";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type Context = { params: Promise<{ storeId: string }> };

function parseStoreId(value: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidDomain(hostname: string) {
  if (hostname.length > 253 || hostname.includes("..") || isIP(hostname) !== 0) return false;
  const labels = hostname.split(".");
  if (labels.length < 2) return false;
  return labels.every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
  );
}

export async function GET(_request: Request, context: Context) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = parseStoreId((await context.params).storeId);
  if (!storeId) return NextResponse.json({ error: "Invalid store ID." }, { status: 400 });

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
  if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });

  const domains = await prisma.store_domain.findMany({
    where: { storeId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      hostname: true,
      status: true,
      isPrimary: true,
      verifiedAt: true,
      verificationToken: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    domains: domains.map((domain) => ({
      id: domain.id,
      hostname: domain.hostname,
      status: domain.status,
      isPrimary: domain.isPrimary,
      verifiedAt: domain.verifiedAt,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      dnsVerification:
        domain.status === "PENDING" && domain.verificationToken
          ? {
              type: "TXT",
              name: `_innovex-verification.${domain.hostname}`,
              value: `innovex-domain-verification=${domain.verificationToken}`,
            }
          : null,
    })),
  });
}

export async function POST(request: Request, context: Context) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = parseStoreId((await context.params).storeId);
  if (!storeId) return NextResponse.json({ error: "Invalid store ID." }, { status: 400 });

  try {
    const body = (await request.json()) as { hostname?: unknown; isPrimary?: unknown };
    const hostname = normalizeHostname(typeof body.hostname === "string" ? body.hostname : null);

    if (!hostname || !isValidDomain(hostname)) {
      return NextResponse.json({ error: "Enter a valid hostname without https://, a path or a port." }, { status: 400 });
    }

    if (isPlatformHostname(hostname)) {
      return NextResponse.json({ error: "This hostname is reserved for the Innovex platform." }, { status: 400 });
    }

    const isLocalTestDomain = hostname.endsWith(".test");
    if (isLocalTestDomain && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: ".test domains are only allowed in local development." }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true },
    });
    if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });

    const existingPrimary = await prisma.store_domain.findFirst({
      where: { storeId, isPrimary: true },
      select: { id: true },
    });

    const domain = await prisma.store_domain.create({
      data: {
        storeId,
        hostname,
        status: isLocalTestDomain ? "ACTIVE" : "PENDING",
        isPrimary: body.isPrimary === true || !existingPrimary,
        verificationToken: randomBytes(24).toString("hex"),
        ...(isLocalTestDomain ? { verifiedAt: new Date() } : {}),
      },
      select: {
        id: true,
        hostname: true,
        status: true,
        isPrimary: true,
        verifiedAt: true,
        verificationToken: true,
      },
    });

    if (domain.isPrimary) {
      await prisma.store_domain.updateMany({
        where: { storeId, id: { not: domain.id } },
        data: { isPrimary: false },
      });
    }

    await writeAuditLog({
      storeId,
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "STORE_DOMAINS",
      action: "CREATE",
      entity: "STORE_DOMAIN",
      entityId: domain.id,
      description: `Added domain ${hostname} to ${store.name}.`,
      metadata: { hostname, status: domain.status },
      ...getRequestAuditContext(request),
    });

    const safeDomain = {
      id: domain.id,
      hostname: domain.hostname,
      status: domain.status,
      isPrimary: domain.isPrimary,
      verifiedAt: domain.verifiedAt,
    };

    return NextResponse.json({
      success: true,
      domain: safeDomain,
      ...(isLocalTestDomain
        ? { message: "Local test domain is active. Add it to your Windows hosts file." }
        : {
            dnsVerification: {
              type: "TXT",
              name: `_innovex-verification.${hostname}`,
              value: `innovex-domain-verification=${domain.verificationToken}`,
              instructions: "Add this TXT record to the domain DNS. Keep the token private until verification is complete.",
            },
            message: "Domain added. Complete DNS verification before activation.",
          }),
    }, { status: 201 });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "This hostname is already registered." }, { status: 409 });
    }
    console.error("Create store domain error:", error);
    return NextResponse.json({ error: "Could not add the store domain." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = parseStoreId((await context.params).storeId);
  if (!storeId) return NextResponse.json({ error: "Invalid store ID." }, { status: 400 });

  try {
    const body = (await request.json()) as { domainId?: unknown; status?: unknown; isPrimary?: unknown };
    const domainId = Number(body.domainId);
    if (!Number.isSafeInteger(domainId) || domainId <= 0) {
      return NextResponse.json({ error: "Invalid domain ID." }, { status: 400 });
    }

    const existing = await prisma.store_domain.findFirst({
      where: { id: domainId, storeId },
      select: { id: true, hostname: true, status: true, isPrimary: true, verifiedAt: true },
    });
    if (!existing) return NextResponse.json({ error: "Domain not found." }, { status: 404 });

    const data: { status?: "ACTIVE" | "DISABLED"; isPrimary?: boolean } = {};
    if (body.status === "ACTIVE" || body.status === "DISABLED") {
      if (body.status === "ACTIVE" && !existing.verifiedAt) {
        return NextResponse.json({ error: "Verify domain ownership before activation." }, { status: 409 });
      }
      data.status = body.status;
    }
    if (body.isPrimary === true && existing.status !== "ACTIVE" && body.status !== "ACTIVE") {
      return NextResponse.json({ error: "Only an active domain can be the primary domain." }, { status: 409 });
    }
    if (typeof body.isPrimary === "boolean") data.isPrimary = body.isPrimary;

    const updated = await prisma.store_domain.update({
      where: { id: domainId },
      data,
      select: { id: true, hostname: true, status: true, isPrimary: true, verifiedAt: true },
    });

    if (updated.isPrimary) {
      await prisma.store_domain.updateMany({
        where: { storeId, id: { not: updated.id } },
        data: { isPrimary: false },
      });
    }

    await writeAuditLog({
      storeId,
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "STORE_DOMAINS",
      action: "UPDATE",
      entity: "STORE_DOMAIN",
      entityId: updated.id,
      description: `Updated domain ${updated.hostname}.`,
      metadata: { status: updated.status, isPrimary: updated.isPrimary },
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, domain: updated });
  } catch (error) {
    console.error("Update store domain error:", error);
    return NextResponse.json({ error: "Could not update the store domain." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const storeId = parseStoreId((await context.params).storeId);
  if (!storeId) return NextResponse.json({ error: "Invalid store ID." }, { status: 400 });

  const domainId = Number(new URL(request.url).searchParams.get("domainId"));
  if (!Number.isSafeInteger(domainId) || domainId <= 0) {
    return NextResponse.json({ error: "Invalid domain ID." }, { status: 400 });
  }

  const domain = await prisma.store_domain.findFirst({
    where: { id: domainId, storeId },
    select: { id: true, hostname: true },
  });
  if (!domain) return NextResponse.json({ error: "Domain not found." }, { status: 404 });

  await prisma.store_domain.delete({ where: { id: domainId } });
  await writeAuditLog({
    storeId,
    superAdminId: auth.session.id,
    actorType: "SUPER_ADMIN",
    module: "STORE_DOMAINS",
    action: "DELETE",
    entity: "STORE_DOMAIN",
    entityId: domain.id,
    description: `Removed domain ${domain.hostname}.`,
    ...getRequestAuditContext(request),
  });

  return NextResponse.json({ success: true });
}
