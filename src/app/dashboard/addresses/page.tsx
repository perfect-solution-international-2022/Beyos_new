"use client";

import { useEffect, useState } from "react";

interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  province: string;
  postalCode: string;
}

const empty: Profile = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  district: "",
  province: "",
  postalCode: "",
};

export default function AddressesPage() {
  const [profile, setProfile] = useState<Profile>(empty);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) setProfile({ ...empty, ...d.profile });
      })
      .finally(() => setLoaded(true));
  }, []);

  const set = (k: keyof Profile) => (v: string) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Update failed");
      setMsg({ type: "ok", text: "Address saved." });
    } catch (err) {
      setMsg({
        type: "err",
        text: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-navy-800">Addresses</h1>
      <p className="mt-1 text-sm text-navy-800/50">
        Manage your default shipping address.
      </p>

      <form
        onSubmit={save}
        className="mt-6 rounded-2xl border border-navy-800/5 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="space-y-4">
          <Field label="Address Line 1">
            <input
              value={profile.addressLine1}
              onChange={(e) => set("addressLine1")(e.target.value)}
              disabled={!loaded}
              className="input"
              placeholder="123 Main Street"
            />
          </Field>
          <Field label="Address Line 2 (Optional)">
            <input
              value={profile.addressLine2}
              onChange={(e) => set("addressLine2")(e.target.value)}
              disabled={!loaded}
              className="input"
              placeholder="Apartment 4B"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City">
              <input
                value={profile.city}
                onChange={(e) => set("city")(e.target.value)}
                disabled={!loaded}
                className="input"
                placeholder="Colombo"
              />
            </Field>
            <Field label="District">
              <input
                value={profile.district}
                onChange={(e) => set("district")(e.target.value)}
                disabled={!loaded}
                className="input"
                placeholder="Colombo"
              />
            </Field>
            <Field label="Province">
              <input
                value={profile.province}
                onChange={(e) => set("province")(e.target.value)}
                disabled={!loaded}
                className="input"
                placeholder="Western"
              />
            </Field>
            <Field label="Postal Code">
              <input
                value={profile.postalCode}
                onChange={(e) => set("postalCode")(e.target.value)}
                disabled={!loaded}
                className="input"
                placeholder="00100"
              />
            </Field>
          </div>
        </div>

        {msg && (
          <p
            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
              msg.type === "ok"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {msg.text}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save Address"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-800">
        {label}
      </label>
      {children}
    </div>
  );
}
