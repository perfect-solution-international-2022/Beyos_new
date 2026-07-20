import { getCurrentUser, PublicUser } from "./auth";

/** Returns the current user only if they are an admin, else null. */
export async function requireAdmin(): Promise<PublicUser | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") return null;
  return user;
}
