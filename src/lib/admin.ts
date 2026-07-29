import { getCurrentUser, PublicUser } from "./auth";
import { AdminSection, canAccessSection } from "./adminSections";

export type { AdminSection };

/** Returns the current user only if they are an admin (any sub-role), else null. */
export async function requireAdmin(): Promise<PublicUser | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user || user.role !== "admin") return null;
  return user;
}

/** Returns the current user only when they are a Super Admin. */
export async function requireSuperAdmin(): Promise<PublicUser | null> {
  const user = await requireAdmin();
  return user?.adminRole === "super" ? user : null;
}

/** Returns the current user only if they're an admin allowed into this section. */
export async function requireAdminSection(section: AdminSection): Promise<PublicUser | null> {
  const user = await requireAdmin();
  if (!user || !canAccessSection(user.adminRole, section)) return null;
  return user;
}

/** Same as requireAdminSection, but passes if the admin has access to any of the given sections. */
export async function requireAdminAnySection(sections: AdminSection[]): Promise<PublicUser | null> {
  const user = await requireAdmin();
  if (!user || !sections.some((s) => canAccessSection(user.adminRole, s))) return null;
  return user;
}
