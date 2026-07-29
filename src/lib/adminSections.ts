export type AdminSection = "catalog" | "sales" | "pos" | "people" | "finance" | "system";
export type AdminRole = "super" | "manager" | "cashier";

const SECTION_ACCESS: Record<AdminRole, AdminSection[] | "all"> = {
  super: "all",
  manager: ["catalog", "sales", "pos"],
  cashier: ["pos"],
};

export function canAccessSection(adminRole: AdminRole | null | undefined, section: AdminSection): boolean {
  // Missing/unknown role metadata must fail closed. Treating NULL as `super`
  // silently grants maximum privileges to incomplete legacy accounts.
  if (!adminRole || !(adminRole in SECTION_ACCESS)) return false;
  const access = SECTION_ACCESS[adminRole];
  return access === "all" || access.includes(section);
}
