"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";

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
      // preserve ?next= for invite flows
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next || "/children");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-3xl font-bold text-indigo-600">🐣 Nestling</h1>
      <p className="mb-8 text-sm text-gray-500">
        {isSignup ? "Create an account to start tracking." : "Welcome back."}
      </p>
      <form onSubmit={submit} className="space-y-4">
        {isSignup && (
          <Field label="Your name" value={name} onChange={setName} type="text" autoComplete="name" />
        )}
        <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="tap w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white active:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "…" : isSignup ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        {isSignup ? (
          <>
            Already have an account? <Link href="/login" className="font-semibold text-indigo-600">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/signup" className="font-semibold text-indigo-600">Sign up</Link>
          </>
        )}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-indigo-500"
        value={value}
        type={type}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </label>
  );
}
