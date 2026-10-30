import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const STORE_SESSION_COOKIE = "session_user";
const SUPER_ADMIN_SESSION_COOKIE = "super_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type StoreAdminSession = {
  userId: number;
  storeId: number;
  storeSlug: string;
  storeName: string;
  name: string;
  username: string;
  email: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  actorType: "STORE_USER" | "SUPER_ADMIN";
  superAdminId: number | null;
  isImpersonating: boolean;
};

export type SuperAdminSession = {
  id: number;
  name: string;
  username: string;
  email: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function createStoreAdminSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.app_session.create({
    data: {
      tokenHash,
      storeUserId: userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    STORE_SESSION_COOKIE,
    token,
    cookieOptions(Math.floor(SESSION_TTL_MS / 1000)),
  );
}

export async function createSuperAdminSession(superAdminId: number) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.app_session.create({
    data: {
      tokenHash,
      superAdminId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SUPER_ADMIN_SESSION_COOKIE,
    token,
    cookieOptions(Math.floor(SESSION_TTL_MS / 1000)),
  );
}

export async function getSession(): Promise<StoreAdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STORE_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.app_session.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    include: {
      storeUser: {
        include: {
          store: {
            select: {
              id: true,
              slug: true,
              name: true,
              isActive: true,
            },
          },
        },
      },
      superAdmin: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !session ||
    !session.storeUser ||
    session.expiresAt <= new Date() ||
    !session.storeUser.isActive ||
    !session.storeUser.store.isActive ||
    (session.superAdminId !== null && !session.superAdmin?.isActive)
  ) {
    return null;
  }

  return {
    userId: session.storeUser.id,
    storeId: session.storeUser.store.id,
    storeSlug: session.storeUser.store.slug,
    storeName: session.storeUser.store.name,
    name: session.storeUser.name,
    username: session.storeUser.username ?? session.storeUser.email,
    email: session.storeUser.email,
    role: session.storeUser.role,
    actorType: session.superAdminId !== null ? "SUPER_ADMIN" : "STORE_USER",
    superAdminId: session.superAdminId ?? null,
    isImpersonating: session.superAdminId !== null,
  };
}

export async function createSuperAdminStoreOverride(
  superAdminId: number,
  storeId: number,
) {
  const superAdmin = await prisma.super_admin.findFirst({
    where: {
      id: superAdminId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!superAdmin) {
    throw new Error("Super Admin account is inactive or not found.");
  }

  const ownerOrAdmin = await prisma.store_user.findFirst({
    where: {
      storeId,
      isActive: true,
      role: { in: ["OWNER", "ADMIN"] },
      store: { isActive: true },
    },
    orderBy: [{ role: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  if (!ownerOrAdmin) {
    throw new Error("No active store administrator exists for this store.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.app_session.create({
    data: {
      tokenHash,
      storeUserId: ownerOrAdmin.id,
      superAdminId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    STORE_SESSION_COOKIE,
    token,
    cookieOptions(60 * 60),
  );
}

export async function getSuperAdminSession(): Promise<SuperAdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.app_session.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    include: {
      superAdmin: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !session ||
    !session.superAdmin ||
    session.expiresAt <= new Date() ||
    !session.superAdmin.isActive
  ) {
    return null;
  }

  return {
    id: session.superAdmin.id,
    name: session.superAdmin.name,
    username: session.superAdmin.username,
    email: session.superAdmin.email ?? "",
  };
}

export async function clearSuperAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.app_session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookieStore.delete(SUPER_ADMIN_SESSION_COOKIE);
}

export async function clearAuthSessions() {
  const cookieStore = await cookies();
  const storeToken = cookieStore.get(STORE_SESSION_COOKIE)?.value;
  const superToken = cookieStore.get(SUPER_ADMIN_SESSION_COOKIE)?.value;

  await Promise.all([
    storeToken
      ? prisma.app_session.deleteMany({
          where: {
            tokenHash: hashToken(storeToken),
          },
        })
      : Promise.resolve(),
    superToken
      ? prisma.app_session.deleteMany({
          where: {
            tokenHash: hashToken(superToken),
          },
        })
      : Promise.resolve(),
  ]);

  cookieStore.delete(STORE_SESSION_COOKIE);
  cookieStore.delete(SUPER_ADMIN_SESSION_COOKIE);
}

export async function exitSuperAdminStoreOverride() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STORE_SESSION_COOKIE)?.value;

  if (token) {
    await prisma.app_session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  cookieStore.delete(STORE_SESSION_COOKIE);
}
