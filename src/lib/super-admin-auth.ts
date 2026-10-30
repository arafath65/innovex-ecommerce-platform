import { getSuperAdminSession } from "@/lib/auth";

export async function requireSuperAdmin() {
  const session = await getSuperAdminSession();

  if (!session) {
    return {
      error: "Unauthorized",
      status: 401 as const,
    };
  }

  return { session };
}
