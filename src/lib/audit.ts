import { prisma } from "@/lib/prisma";

export type AuditActorType = "STORE_USER" | "SUPER_ADMIN" | "SYSTEM";

export type AuditLogInput = {
  storeId?: number | null;
  storeUserId?: number | null;
  superAdminId?: number | null;
  actorType: AuditActorType;
  module: string;
  action: string;
  entity?: string | null;
  entityId?: number | string | null;
  description: string;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(input: AuditLogInput) {
  try {
    await prisma.audit_log.create({
      data: {
        storeId: input.storeId ?? null,
        storeUserId: input.storeUserId ?? null,
        superAdminId: input.superAdminId ?? null,
        actorType: input.actorType,
        module: input.module,
        action: input.action,
        entity: input.entity ?? null,
        entityId:
          input.entityId === undefined || input.entityId === null
            ? null
            : String(input.entityId),
        description: input.description,
        metadata: input.metadata as never,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("Audit log write failed:", error);
  }
}

export function getRequestAuditContext(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null,
    userAgent: request.headers.get("user-agent") ?? null,
  };
}
