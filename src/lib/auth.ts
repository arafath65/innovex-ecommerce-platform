
import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "innovex_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export type SessionUser = {
  userId: number;
  storeId: number;
  storeSlug: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "STAFF";
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be configured with at least 32 characters.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionSecret());

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    if (
      typeof payload.userId !== "number" ||
      typeof payload.storeId !== "number" ||
      typeof payload.storeSlug !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      !["OWNER", "ADMIN", "STAFF"].includes(String(payload.role))
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      storeId: payload.storeId,
      storeSlug: payload.storeSlug,
      name: payload.name,
      email: payload.email,
      role: payload.role as SessionUser["role"],
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}