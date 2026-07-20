"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="mt-8">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          This reset link is missing its token. Please request a new one.
        </p>
        <Link href="/forgot-password" className="btn-primary mt-6 w-full">
          Request a New Link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-8">
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Link href="/login" className="btn-primary mt-6 w-full">
          Sign In
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reset password");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy-800">
          New Password
        </label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-navy-800">
          Confirm New Password
        </label>
        <PasswordInput
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repeat password"
          autoComplete="new-password"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Resetting…" : "Reset Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Choose a new password for your Beyos account."
    >
      <Suspense fallback={<div className="mt-8 text-navy-800/50">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
