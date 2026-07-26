"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface AdminUser {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  adminRole: "super" | "manager" | "cashier" | null;
  phone: string;
  city: string | null;
  resellerStatus: "pending" | "approved" | "suspended" | "rejected";
  accountStatus: "active" | "suspended" | "disabled";
  lastLoginAt: string | null;
  createdAt: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  isWholesaleCustomer: boolean;
  wholesaleSince?: string | null;
}

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  reseller: "bg-brand-100 text-brand-700",
  buyer: "bg-blue-100 text-blue-700",
};

const adminRoleLabel: Record<string, string> = {
  super: "Super Admin",
  manager: "Manager",
  cashier: "Cashier",
};

const blank = { firstName: "", lastName: "", email: "", phone: "", password: "", role: "buyer", adminRole: "super" };

export default function AdminUsersTable({
  title,
  role,
  manage = false,
  wholesaleOnly = false,
}: {
  title: string;
  role?: string;
  manage?: boolean;
  wholesaleOnly?: boolean;
}) {
  const { toast, confirm } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(0);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<AdminUser | null>(null);

  const load = () => {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (wholesaleOnly) params.set("wholesale", "true");
    const qs = params.size ? `?${params}` : "";
    fetch(`/api/admin/users${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, [role, wholesaleOnly]);
  useEffect(() => { if (manage && new URLSearchParams(window.location.search).get("new")) setCreating(true); }, [manage]);

  const filtered = useMemo(
    () => users.filter((u) => {
      const matchesRole = !manage || roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = !manage || statusFilter === "all"
        || (statusFilter === "pending" ? u.role === "reseller" && u.resellerStatus === "pending" : u.accountStatus === statusFilter);
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || `${u.name} ${u.email} ${u.phone || ""} ${u.city || ""}`.toLowerCase().includes(term);
      return matchesRole && matchesStatus && matchesSearch;
    }),
    [users, search, manage, roleFilter, statusFilter]
  );

  const changeRole = async (id: number, newRole: string) => {
    setSaving(id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update role");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole, adminRole: newRole === "admin" ? (u.adminRole ?? "super") : null } : u)));
      setViewing((current) => current?.id === id ? { ...current, role: newRole, adminRole: newRole === "admin" ? (current.adminRole ?? "super") : null } : current);
      toast("User role updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update role", "error");
    } finally { setSaving(0); }
  };

  const changeAdminRole = async (id: number, adminRole: string) => {
    setSaving(id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, adminRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update admin access");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, adminRole: adminRole as AdminUser["adminRole"] } : u)));
      setViewing((current) => current?.id === id ? { ...current, adminRole: adminRole as AdminUser["adminRole"] } : current);
      toast("Admin access updated");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update admin access", "error");
    } finally { setSaving(0); }
  };

  const changeAccountStatus = async (id: number, accountStatus: AdminUser["accountStatus"]) => {
    setSaving(id);
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, accountStatus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update account status");
      setUsers((current) => current.map((user) => user.id === id ? { ...user, accountStatus } : user));
      setViewing((current) => current?.id === id ? { ...current, accountStatus } : current);
      toast(accountStatus === "active" ? "Account reactivated" : `Account ${accountStatus}`);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not update account status", "error");
    } finally { setSaving(0); }
  };

  const changeWholesale = async (id: number, isWholesaleCustomer: boolean) => {
    setSaving(id);
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, wholesaleCustomer: isWholesaleCustomer }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update wholesale access");
      if (wholesaleOnly && !isWholesaleCustomer) setUsers((current) => current.filter((user) => user.id !== id));
      else setUsers((current) => current.map((user) => user.id === id ? { ...user, isWholesaleCustomer } : user));
      setViewing((current) => current?.id === id ? { ...current, isWholesaleCustomer } : current);
      toast(isWholesaleCustomer ? "Wholesale pricing enabled" : "Wholesale pricing removed");
    } catch (cause) { toast(cause instanceof Error ? cause.message : "Could not update wholesale access", "error"); }
    finally { setSaving(0); }
  };

  const exportCsv = () => {
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headers = ["Customer ID", "Name", "First Name", "Last Name", "Email", "Phone", "Address Line 1", "Address Line 2", "City", "District", "Province", "Postal Code", "Account Status", "Wholesale Since", "Last Login", "Registered At"];
    const rows = filtered.map((user) => [user.id, user.name, user.firstName, user.lastName, user.email, user.phone, user.addressLine1, user.addressLine2, user.city, user.district, user.province, user.postalCode, user.accountStatus, user.wholesaleSince, user.lastLoginAt, user.createdAt]);
    const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `wholesale-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateProfile = async (id: number, profile: { firstName: string; lastName: string; email: string; phone: string; city: string }) => {
    setSaving(id);
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, profile }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update user");
      const updates = { ...profile, name: `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim() };
      setUsers((current) => current.map((user) => user.id === id ? { ...user, ...updates } : user));
      setViewing((current) => current?.id === id ? { ...current, ...updates } : current);
      toast("User profile updated");
      return true;
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not update user", "error");
      return false;
    } finally { setSaving(0); }
  };

  const changeResellerStatus = async (id: number, resellerStatus: "approved" | "suspended" | "rejected") => {
    setSaving(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, resellerStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update reseller");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, resellerStatus } : u)));
      setViewing((current) => current?.id === id ? { ...current, resellerStatus } : current);
      toast(`Reseller ${resellerStatus}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update reseller");
    } finally {
      setSaving(0);
    }
  };

  const del = async (u: AdminUser) => {
    const ok = await confirm({
      title: "Archive user?",
      message: `Move ${u.name} (${u.email}) to Trash? You can restore this account later.`,
      confirmText: "Archive",
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not archive user");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast(`Archived ${u.name}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not archive user", "error");
    }
  };

  const counts = useMemo(() => ({
    all: users.length,
    buyer: users.filter((user) => user.role === "buyer").length,
    reseller: users.filter((user) => user.role === "reseller").length,
    admin: users.filter((user) => user.role === "admin").length,
    pendingResellers: users.filter((user) => user.role === "reseller" && user.resellerStatus === "pending").length,
    active: users.filter((user) => user.accountStatus === "active").length,
    suspended: users.filter((user) => user.accountStatus === "suspended").length,
  }), [users]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">{title}</h1>
          <p className="mt-1 text-sm text-navy-800/55">
            {manage ? "Manage customer, reseller and staff accounts and their access." : `View and manage ${title.toLowerCase()} accounts.`}
          </p>
        </div>
        {manage && <button onClick={() => setCreating(true)} className="btn-primary">+ Add User</button>}
        {wholesaleOnly && <button type="button" onClick={exportCsv} disabled={!filtered.length} className="btn-primary disabled:opacity-50">Export CSV</button>}
      </div>

      {manage && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {([
              ["all", "All Users", counts.all],
              ["active", "Active", counts.active],
              ["pending", "Pending approval", counts.pendingResellers],
              ["suspended", "Suspended", counts.suspended],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`border bg-white p-4 text-left transition ${statusFilter === value ? "border-brand shadow-sm" : "border-navy-800/10 hover:border-navy-800/25"}`}
              >
                <span className="block text-xs font-semibold uppercase text-navy-800/50">{label}</span>
                <span className="mt-1 block text-2xl font-bold text-navy-800">{count}</span>
              </button>
            ))}
          </div>
          {counts.pendingResellers > 0 && (
            <button type="button" onClick={() => { setStatusFilter("pending"); setSearch(""); }} className="mt-4 flex w-full items-center justify-between border border-amber-300 bg-amber-50 px-4 py-3 text-left">
              <span>
                <span className="font-semibold text-amber-900">{counts.pendingResellers} reseller {counts.pendingResellers === 1 ? "application" : "applications"} waiting for approval</span>
                <span className="ml-2 text-sm text-amber-800/70">Review the account details before approving.</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-amber-800">Review</span>
            </button>
          )}
        </>
      )}

      <div className="mt-6 flex flex-col gap-3 border-y border-navy-800/10 bg-white px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input sm:max-w-md" placeholder="Search name, email, phone or city…" />
        {manage && <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="input lg:max-w-[180px]"><option value="all">All roles</option><option value="buyer">Customer</option><option value="reseller">Reseller</option><option value="admin">Staff & Admin</option></select>}
        <div className="flex items-center justify-between gap-4 text-sm text-navy-800/55 sm:justify-end">
          <span>{filtered.length} {filtered.length === 1 ? "record" : "records"}</span>
          {(search || (manage && (roleFilter !== "all" || statusFilter !== "all"))) && (
            <button type="button" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }} className="font-semibold text-brand hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border-b border-navy-800/10 bg-white">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Last active</th>
              <th className="px-6 py-4">Joined</th>
              {role === "reseller" && <th className="px-6 py-4"></th>}
              {(manage || wholesaleOnly || role === "buyer" || role === "admin") && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={manage ? 7 : role === "reseller" ? 7 : 6} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={manage ? 7 : role === "reseller" ? 7 : 6} className="px-6 py-12 text-center text-navy-800/50">No users match the current filters.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                      <span className="min-w-0"><span className="block font-medium text-navy-800">{u.name}</span><span className="block truncate text-xs text-navy-800/45">{u.email}</span></span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-navy-800/60"><span className="block">{u.phone || "No phone"}</span><span className="mt-0.5 block text-xs text-navy-800/40">{u.city || "No location"}</span></td>
                  <td className="px-6 py-4">
                    <span className={`badge capitalize ${u.accountStatus === "active" ? "bg-emerald-100 text-emerald-700" : u.accountStatus === "suspended" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{u.accountStatus}</span>
                    {u.role === "reseller" && u.resellerStatus === "pending" && <span className="badge ml-2 bg-blue-100 text-blue-700">Approval pending</span>}
                  </td>
                  <td className="px-6 py-4">
                    {manage ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge capitalize ${roleBadge[u.role] ?? "bg-navy-50 text-navy-800"}`}>{u.role}</span>
                        {u.isWholesaleCustomer && <span className="badge bg-emerald-100 text-emerald-700">Wholesale</span>}
                        {u.adminRole && <span className="text-xs text-navy-800/45">{adminRoleLabel[u.adminRole]}</span>}
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge capitalize ${roleBadge[u.role] ?? "bg-navy-50 text-navy-800"}`}>{u.role}</span>
                        {u.isWholesaleCustomer && <span className="badge bg-emerald-100 text-emerald-700">Wholesale</span>}
                        {u.role === "admin" && u.adminRole && (
                          <span className="badge bg-navy-50 text-navy-800">{adminRoleLabel[u.adminRole]}</span>
                        )}
                        {role === "reseller" && (
                          <>
                            <span className={`badge capitalize ${u.resellerStatus === "approved" ? "bg-emerald-100 text-emerald-700" : u.resellerStatus === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                              {u.resellerStatus}
                            </span>
                            {u.resellerStatus !== "approved" && (
                              <button disabled={saving === u.id} onClick={() => changeResellerStatus(u.id, "approved")} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Approve</button>
                            )}
                            {u.resellerStatus !== "rejected" && (
                              <button disabled={saving === u.id} onClick={() => changeResellerStatus(u.id, "rejected")} className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Reject</button>
                            )}
                            {u.resellerStatus !== "suspended" && (
                              <button disabled={saving === u.id} onClick={() => changeResellerStatus(u.id, "suspended")} className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100">Suspend</button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-navy-800/60">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-GB") : "Never"}</td>
                  <td className="px-6 py-4 text-navy-800/60">{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                  {role === "reseller" && (
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/resellers/${u.id}`}
                          className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100"
                        >
                          View
                        </Link>
                        <Link
                          href={`/admin/resellers/${u.id}#orders`}
                          className="rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-100"
                        >
                          Orders
                        </Link>
                      </div>
                    </td>
                  )}
                  {(manage || wholesaleOnly || role === "buyer" || role === "admin") && (
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewing(u)} className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand">Manage</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && <NewUserModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); toast("User created"); }} />}
      {viewing && (
        <UserDetailModal
          user={viewing}
          saving={saving === viewing.id}
          onClose={() => setViewing(null)}
          onApprove={() => changeResellerStatus(viewing.id, "approved")}
          onSuspend={() => changeResellerStatus(viewing.id, "suspended")}
          onReject={() => changeResellerStatus(viewing.id, "rejected")}
          onChangeRole={(nextRole) => changeRole(viewing.id, nextRole)}
          onChangeAdminRole={(nextRole) => changeAdminRole(viewing.id, nextRole)}
          onChangeAccountStatus={(status) => changeAccountStatus(viewing.id, status)}
          onChangeWholesale={(enabled) => changeWholesale(viewing.id, enabled)}
          onSaveProfile={(profile) => updateProfile(viewing.id, profile)}
          onDelete={async () => { await del(viewing); setViewing(null); }}
        />
      )}
    </div>
  );
}

function UserDetailModal({
  user, saving, onClose, onApprove, onSuspend, onReject, onChangeRole, onChangeAdminRole,
  onChangeAccountStatus, onSaveProfile, onDelete,
  onChangeWholesale,
}: {
  user: AdminUser;
  saving: boolean;
  onClose: () => void;
  onApprove: () => void;
  onSuspend: () => void;
  onReject: () => void;
  onChangeRole: (role: string) => void;
  onChangeAdminRole: (role: string) => void;
  onChangeAccountStatus: (status: AdminUser["accountStatus"]) => void;
  onChangeWholesale: (enabled: boolean) => void;
  onSaveProfile: (profile: { firstName: string; lastName: string; email: string; phone: string; city: string }) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [profile, setProfile] = useState({ firstName: user.firstName || user.name.split(" ")[0] || "", lastName: user.lastName || user.name.split(" ").slice(1).join(" "), email: user.email, phone: user.phone || "", city: user.city || "" });
  const statusStyle = user.resellerStatus === "approved"
    ? "bg-emerald-100 text-emerald-700"
    : user.resellerStatus === "rejected"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-navy-800/10 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-800 text-lg font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-navy-800">{user.name}</h2>
              <p className="truncate text-sm text-navy-800/50">{user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close user details" title="Close" className="flex h-9 w-9 shrink-0 items-center justify-center text-2xl text-navy-800/45 hover:text-navy-800">×</button>
        </div>

        <div className="grid gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-7">
          <Detail label="User ID" value={`#${user.id}`} />
          <Detail label="Joined" value={new Date(user.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} />
          <Detail label="Email"><a href={`mailto:${user.email}`} className="break-all font-medium text-brand hover:underline">{user.email}</a></Detail>
          <Detail label="Phone">{user.phone ? <a href={`tel:${user.phone}`} className="font-medium text-brand hover:underline">{user.phone}</a> : <span>Not provided</span>}</Detail>
          <Detail label="Location" value={user.city || "Not provided"} />
          <Detail label="Address" value={[user.addressLine1, user.addressLine2, user.city, user.district, user.province, user.postalCode].filter(Boolean).join(", ") || "Not provided"} />
          <Detail label="Account role">
            <div className="flex flex-wrap gap-2">
              <span className={`badge capitalize ${roleBadge[user.role] ?? "bg-navy-50 text-navy-800"}`}>{user.role}</span>
              {user.adminRole && <span className="badge bg-navy-50 text-navy-800">{adminRoleLabel[user.adminRole]}</span>}
            </div>
          </Detail>
        </div>

        <div className="border-t border-navy-800/10 px-5 py-6 sm:px-7">
          <h3 className="font-bold text-navy-800">Profile</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="First name"><input className="input" value={profile.firstName} onChange={(event) => setProfile((current) => ({ ...current, firstName: event.target.value }))} /></Field>
            <Field label="Last name"><input className="input" value={profile.lastName} onChange={(event) => setProfile((current) => ({ ...current, lastName: event.target.value }))} /></Field>
            <Field label="Email"><input type="email" className="input" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} /></Field>
            <Field label="Phone"><input className="input" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} /></Field>
            <Field label="City"><input className="input" value={profile.city} onChange={(event) => setProfile((current) => ({ ...current, city: event.target.value }))} /></Field>
          </div>
          <button type="button" disabled={saving} onClick={() => onSaveProfile(profile)} className="btn-primary mt-4 disabled:opacity-50">Save profile</button>
        </div>

        <div className="grid gap-5 border-t border-navy-800/10 px-5 py-6 sm:grid-cols-2 sm:px-7">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy-800">Account role</label>
            <select value={user.role} disabled={saving} onChange={(event) => onChangeRole(event.target.value)} className="input">
              <option value="buyer">Customer</option><option value="reseller">Reseller</option><option value="admin">Staff / Admin</option>
            </select>
          </div>
          {user.role === "admin" && <div><label className="mb-1.5 block text-sm font-medium text-navy-800">Access level</label><select value={user.adminRole ?? "super"} disabled={saving} onChange={(event) => onChangeAdminRole(event.target.value)} className="input"><option value="super">Super Admin</option><option value="manager">Manager</option><option value="cashier">Cashier</option></select></div>}
        </div>

        {user.role === "buyer" && (
          <div className="flex flex-col gap-4 border-t border-emerald-100 bg-emerald-50/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <p className="text-sm font-bold text-navy-800">Wholesale customer</p>
              <p className="mt-1 text-xs leading-5 text-navy-800/55">Wholesale-priced products apply from one item. Products without a wholesale price keep their normal sale or regular price.</p>
              {user.wholesaleSince && <p className="mt-1 text-xs text-emerald-700">Enabled {new Date(user.wholesaleSince).toLocaleDateString("en-GB")}</p>}
            </div>
            <button type="button" disabled={saving} onClick={() => onChangeWholesale(!user.isWholesaleCustomer)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${user.isWholesaleCustomer ? "bg-red-100 text-red-700" : "bg-emerald-600 text-white"}`}>{user.isWholesaleCustomer ? "Remove wholesale" : "Make wholesale"}</button>
          </div>
        )}

        {user.role === "reseller" && (
          <div className="border-t border-navy-800/10 bg-navy-50/60 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-navy-800/50">Reseller account status</p>
                <span className={`badge mt-2 capitalize ${statusStyle}`}>{user.resellerStatus}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.resellerStatus !== "approved" && <button type="button" disabled={saving} onClick={onApprove} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve</button>}
                {user.resellerStatus !== "suspended" && <button type="button" disabled={saving} onClick={onSuspend} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">Suspend</button>}
                {user.resellerStatus !== "rejected" && <button type="button" disabled={saving} onClick={onReject} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Reject</button>}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-navy-800/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div><p className="text-sm font-semibold text-navy-800">Account access</p><p className="mt-0.5 text-xs text-navy-800/50">Suspending signs the user out and blocks future sign-ins.</p></div>
          <div className="flex flex-wrap gap-2">
            {user.accountStatus !== "active" && <button type="button" disabled={saving} onClick={() => onChangeAccountStatus("active")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Reactivate</button>}
            {user.accountStatus !== "suspended" && <button type="button" disabled={saving} onClick={() => onChangeAccountStatus("suspended")} className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50">Suspend</button>}
            {user.accountStatus !== "disabled" && <button type="button" disabled={saving} onClick={() => onChangeAccountStatus("disabled")} className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Disable</button>}
          </div>
        </div>
        <div className="border-t border-red-100 px-5 py-4 text-right sm:px-7"><button type="button" onClick={onDelete} className="text-sm font-semibold text-red-600 hover:underline">Archive user</button></div>
      </div>
    </div>
  );
}

function Detail({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-navy-800/45">{label}</p>
      <div className="mt-1.5 text-sm text-navy-800/75">{children ?? value}</div>
    </div>
  );
}

function NewUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-navy-800">Add User</h2>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name"><input value={form.firstName} onChange={(e) => set("firstName")(e.target.value)} className="input" /></Field>
            <Field label="Last Name"><input value={form.lastName} onChange={(e) => set("lastName")(e.target.value)} className="input" /></Field>
          </div>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} className="input" placeholder="user@example.com" /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => set("phone")(e.target.value)} className="input" placeholder="0771234567" /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={(e) => set("password")(e.target.value)} className="input" placeholder="Min. 8 characters" /></Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => set("role")(e.target.value)} className="input">
              <option value="buyer">Buyer</option><option value="reseller">Reseller</option><option value="admin">Admin</option>
            </select>
          </Field>
          {form.role === "admin" && (
            <Field label="Admin Role">
              <select value={form.adminRole} onChange={(e) => set("adminRole")(e.target.value)} className="input">
                <option value="super">Super Admin — full access</option>
                <option value="manager">Manager — Catalog, Sales, POS</option>
                <option value="cashier">Cashier — POS only</option>
              </select>
            </Field>
          )}
          {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Create User"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-800">{label}</label>
      {children}
    </div>
  );
}
