import { getCurrentUser, PublicUser } from "./auth";
import { AdminSection, canAccessSection } from "./adminSections";

export type { AdminSection };

/** Returns the current user only if they are an admin (any sub-role), else null. */
export async function requireAdmin(): Promise<PublicUser | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") return null;
  return user;
}

/** Returns the current user only if they're an admin allowed into this section. */
export async function requireAdminSection(section: AdminSection): Promise<PublicUser | null> {
  const user = await requireAdmin();
  if (!user || !canAccessSection(user.adminRole, section)) return null;
  return user;
}
