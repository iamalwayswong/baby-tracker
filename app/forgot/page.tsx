"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Field, TextInput } from "@/app/components/ui";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/auth/forgot", { json: { email } });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-3xl font-bold text-brand-600">🐣 Nestling</h1>
      <p className="mb-8 text-sm text-ink-soft">Reset your password</p>

      {sent ? (
        <div className="rounded-2xl bg-accent-soft p-4 text-sm text-ink-soft">
          If an account exists for <b>{email}</b>, we&apos;ve sent a reset link. Check your inbox.
          <div className="mt-4">
            <Link href="/login" className="font-semibold text-brand-600">
              Back to log in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <TextInput type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" fullWidth loading={busy}>
            Send reset link
          </Button>
          <p className="text-center text-sm text-ink-soft">
            <Link href="/login" className="font-semibold text-brand-600">
              Back to log in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
