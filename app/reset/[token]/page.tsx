"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Field, TextInput } from "@/app/components/ui";

export default function ResetPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/api/auth/reset", { json: { token: params.token, password } });
      // reset signs the user in; land them in the app
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-3xl font-bold text-brand-600">🐣 Nestling</h1>
      <p className="mb-8 text-sm text-gray-500">Choose a new password</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password">
          <TextInput
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        {error && (
          <p className="text-sm text-red-600">
            {error} <Link href="/forgot" className="font-semibold underline">Request a new link</Link>
          </p>
        )}
        <Button type="submit" fullWidth loading={busy}>
          Set new password
        </Button>
      </form>
    </div>
  );
}
