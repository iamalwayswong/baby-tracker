"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Field, TextInput } from "@/app/components/ui";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api(`/api/auth/${mode}`, { json: isSignup ? { name, email, password } : { email, password } });
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next || "/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-3xl font-bold text-brand-600">🐣 Nestling</h1>
      <p className="mb-8 text-sm text-ink-soft">
        {isSignup ? "Create an account to start tracking." : "Welcome back."}
      </p>
      <form onSubmit={submit} className="space-y-4">
        {isSignup && (
          <Field label="Your name">
            <TextInput value={name} type="text" autoComplete="name" onChange={(e) => setName(e.target.value)} required />
          </Field>
        )}
        <Field label="Email">
          <TextInput value={email} type="email" autoComplete="email" onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <TextInput
            value={password}
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!isSignup && (
          <div className="text-right">
            <Link href="/forgot" className="text-sm font-medium text-brand-600">
              Forgot password?
            </Link>
          </div>
        )}
        <Button type="submit" fullWidth loading={busy}>
          {isSignup ? "Create account" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-600">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-brand-600">
              Sign up
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
