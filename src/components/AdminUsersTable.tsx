"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/context/ToastProvider";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  city: string | null;
  resellerStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

const roleBadge: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  reseller: "bg-brand-100 text-brand-700",
  buyer: "bg-blue-100 text-blue-700",
};

const blank = { firstName: "", lastName: "", email: "", phone: "", password: "", role: "buyer" };

export default function AdminUsersTable({
  title,
  role,
  manage = false,
}: {
  title: string;
  role?: string;
  manage?: boolean;
}) {
  const { toast, confirm } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(0);
  const [creating, setCreating] = useState(false);

  const load = () => {
    const qs = role ? `?role=${role}` : "";
    fetch(`/api/admin/users${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, [role]);
  useEffect(() => { if (manage && new URLSearchParams(window.location.search).get("new")) setCreating(true); }, [manage]);

  const filtered = useMemo(
    () => users.filter((u) => !search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );

  const changeRole = async (id: number, newRole: string) => {
    setSaving(id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
    try {
      await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role: newRole }),
      });
    } finally { setSaving(0); }
  };

  const changeResellerStatus = async (id: number, resellerStatus: "approved" | "rejected") => {
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
      toast(resellerStatus === "approved" ? "Reseller approved" : "Reseller rejected");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not update reseller");
    } finally {
      setSaving(0);
    }
  };

  const del = async (u: AdminUser) => {
    const ok = await confirm({
      title: "Delete user?",
      message: `Permanently delete ${u.name} (${u.email})? This cannot be undone.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
    await fetch("/api/admin/users", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id }),
    });
    toast(`Deleted ${u.name}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-800">{title}</h1>
        {manage && <button onClick={() => setCreating(true)} className="btn-primary">+ Add User</button>}
      </div>

      <div className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-5 shadow-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input sm:max-w-md" placeholder="Search by name or email…" />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy-800/5 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-800/10 text-xs font-semibold uppercase tracking-wide text-navy-800/50">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4">Role</th>
              {manage && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={manage ? 6 : 5} className="px-6 py-10 text-center text-navy-800/50">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={manage ? 6 : 5} className="px-6 py-10 text-center text-navy-800/50">No records found</td></tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="border-b border-navy-800/5 last:border-0">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                      <span className="font-medium text-navy-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-navy-800/70">{u.email}</td>
                  <td className="px-6 py-4 text-navy-800/60">{u.phone || "—"}</td>
                  <td className="px-6 py-4 text-navy-800/60">{new Date(u.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-4">
                    {manage ? (
                      <select
                        value={u.role}
                        disabled={saving === u.id}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="rounded-lg border border-navy-800/15 bg-white px-2 py-1.5 text-xs font-medium capitalize text-navy-800 outline-none focus:border-brand"
                      >
                        <option value="buyer">buyer</option>
                        <option value="reseller">reseller</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge capitalize ${roleBadge[u.role] ?? "bg-navy-50 text-navy-800"}`}>{u.role}</span>
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
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  {manage && (
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <button onClick={() => del(u)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button>
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
