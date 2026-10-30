import { resolveTxt } from "node:dns/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/super-admin-auth";
import { getRequestAuditContext, writeAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

type Context = { params: Promise<{ storeId: string; domainId: string }> };

export async function POST(request: Request, context: Context) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const params = await context.params;
  const storeId = Number(params.storeId);
  const domainId = Number(params.domainId);

  if (
    !Number.isSafeInteger(storeId) || storeId <= 0 ||
    !Number.isSafeInteger(domainId) || domainId <= 0
  ) {
    return NextResponse.json({ error: "Invalid store or domain ID." }, { status: 400 });
  }

  const domain = await prisma.store_domain.findFirst({
    where: { id: domainId, storeId },
    select: {
      id: true,
      hostname: true,
      status: true,
      verificationToken: true,
    },
  });

  if (!domain) return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  if (domain.hostname.endsWith(".test")) {
    return NextResponse.json({ error: "Local .test domains do not use public DNS verification." }, { status: 400 });
  }
  if (!domain.verificationToken) {
    return NextResponse.json({ error: "No verification token is configured." }, { status: 409 });
  }

  const recordName = `_innovex-verification.${domain.hostname}`;
  const expectedValue = `innovex-domain-verification=${domain.verificationToken}`;

  try {
    const txtRecords = await resolveTxt(recordName);
    const values = txtRecords.map((record) => record.join(""));

    if (!values.includes(expectedValue)) {
      return NextResponse.json({
        success: false,
        verified: false,
        message: `The expected TXT value was not found at ${recordName}.`,
      }, { status: 409 });
    }

    const updated = await prisma.store_domain.update({
      where: { id: domain.id },
      data: { status: "VERIFIED", verifiedAt: new Date() },
      select: { id: true, hostname: true, status: true, verifiedAt: true },
    });

    await writeAuditLog({
      storeId,
      superAdminId: auth.session.id,
      actorType: "SUPER_ADMIN",
      module: "STORE_DOMAINS",
      action: "VERIFY",
      entity: "STORE_DOMAIN",
      entityId: domain.id,
      description: `Verified ownership of ${domain.hostname}.`,
      ...getRequestAuditContext(request),
    });

    return NextResponse.json({ success: true, verified: true, domain: updated });
  } catch (error) {
    console.error("Domain DNS verification error:", error);
    return NextResponse.json({
      success: false,
      verified: false,
      message: "Unable to find the DNS TXT record yet. Confirm the record and try again.",
    }, { status: 409 });
  }
}
