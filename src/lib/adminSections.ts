export type AdminSection = "catalog" | "sales" | "pos" | "people" | "finance" | "system";
export type AdminRole = "super" | "manager" | "cashier";

const SECTION_ACCESS: Record<AdminRole, AdminSection[] | "all"> = {
  super: "all",
  manager: ["catalog", "sales", "pos"],
  cashier: ["pos"],
};

export function canAccessSection(adminRole: AdminRole | null | undefined, section: AdminSection): boolean {
  const access = SECTION_ACCESS[adminRole ?? "super"];
  return access === "all" || access.includes(section);
}
