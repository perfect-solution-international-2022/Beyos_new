"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import PasswordInput from "@/components/PasswordInput";
import { safeInternalRedirect } from "@/lib/safeRedirect";

type Role = "buyer" | "reseller";

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-navy-800">
        {label}
        {optional && (
          <span className="font-normal text-navy-800/40"> (Optional)</span>
        )}
      </label>
      {children}
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeInternalRedirect(searchParams.get("redirect"));
  const { register } = useAuth();

  const [role, setRole] = useState<Role>("buyer");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    province: "",
    postalCode: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const u = await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role,
        ...(role === "reseller" && {
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          district: form.district,
          province: form.province,
          postalCode: form.postalCode,
        }),
      });
      const dest =
        redirect !== "/" ? redirect : u.role === "reseller" ? "/reseller" : "/";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const loginHref = `/login${
    redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""
  }`;

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-navy-50 px-4 py-12">
      <div className="w-full max-w-[540px] rounded-3xl bg-white p-5 shadow-sm ring-1 ring-navy-800/5 sm:p-10">
        {/* Logo + heading */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/images/logo.png"
              alt="Beyos Clothing"
              width={72}
              height={72}
              className="mx-auto h-16 w-16 object-contain"
            />
          </Link>
          <h1 className="mt-3 font-display text-2xl font-bold text-navy-800 min-[360px]:text-3xl">
            Create Account
          </h1>
          <p className="mt-1 text-sm text-navy-800/60">
            {role === "buyer"
              ? "Join our community to start shopping"
              : "Join our community to start selling"}
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-7 grid grid-cols-2 border-b border-navy-800/10">
          {(["buyer", "reseller"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setError("");
              }}
              className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition ${
                role === r
                  ? "border-brand text-brand"
                  : "border-transparent text-navy-800/50 hover:text-navy-800"
              }`}
            >
              {r === "buyer" ? "I'm a Buyer" : "Become a Reseller"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First Name">
              <input
                required
                value={form.firstName}
                onChange={(e) => set("firstName")(e.target.value)}
                className="input"
                placeholder="Enter first name"
              />
            </Field>
            <Field label="Last Name">
              <input
                required
                value={form.lastName}
                onChange={(e) => set("lastName")(e.target.value)}
                className="input"
                placeholder="Enter last name"
              />
            </Field>
          </div>

          <Field label="Email">
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              className="input"
              placeholder="example@email.com"
            />
          </Field>

          <Field label="Phone Number">
            <input
              required
              value={form.phone}
              onChange={(e) => set("phone")(e.target.value)}
              className="input"
              placeholder="0771234567"
            />
          </Field>

          {/* Reseller-only address fields */}
          {role === "reseller" && (
            <>
              <Field label="Address Line 1">
                <input
                  required
                  value={form.addressLine1}
                  onChange={(e) => set("addressLine1")(e.target.value)}
                  className="input"
                  placeholder="123 Main Street"
                />
              </Field>
              <Field label="Address Line 2" optional>
                <input
                  value={form.addressLine2}
                  onChange={(e) => set("addressLine2")(e.target.value)}
                  className="input"
                  placeholder="Apartment 4B"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City">
                  <input
                    required
                    value={form.city}
                    onChange={(e) => set("city")(e.target.value)}
                    className="input"
                    placeholder="Colombo"
                  />
                </Field>
                <Field label="District">
                  <input
                    required
                    value={form.district}
                    onChange={(e) => set("district")(e.target.value)}
                    className="input"
                    placeholder="Colombo"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Province">
                  <input
                    required
                    value={form.province}
                    onChange={(e) => set("province")(e.target.value)}
                    className="input"
                    placeholder="Western"
                  />
                </Field>
                <Field label="Postal Code">
                  <input
                    required
                    value={form.postalCode}
                    onChange={(e) => set("postalCode")(e.target.value)}
                    className="input"
                    placeholder="00100"
                  />
                </Field>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password">
              <PasswordInput
                required
                value={form.password}
                onChange={set("password")}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm Password">
              <PasswordInput
                required
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </Field>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? "Creating account…"
              : role === "buyer"
                ? "Create Account"
                : "Create Reseller Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-navy-800/60">
          Already have an account?{" "}
          <Link href={loginHref} className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-navy-800/40">
          © {new Date().getFullYear()} Beyos Clothing. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-navy-800/50">Loading…</div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
