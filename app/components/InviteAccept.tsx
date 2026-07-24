"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button } from "@/app/components/ui";

export default function InviteAccept({
  token,
  info,
  loggedIn,
}: {
  token: string;
  info: { childName?: string; inviter?: string; valid?: boolean } | null;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!info || info.valid === false) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-4xl">🙈</p>
        <h1 className="mt-4 text-xl font-bold">Invite not available</h1>
        <p className="mt-2 text-sm text-gray-500">This link is invalid, already used, or expired.</p>
        <Link href="/" className="mt-6 inline-block font-semibold text-brand-600">
          Go home
        </Link>
      </div>
    );
  }

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const { childId } = await api<{ childId: string }>(`/api/invites/${token}`, { method: "POST" });
      router.push(`/child/${childId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="px-6 py-16 text-center">
      <p className="text-5xl">👶</p>
      <h1 className="mt-4 text-2xl font-bold">
        {info.inviter} invited you to help track {info.childName}
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        You&apos;ll share one live timeline — feeds, sleep, diapers and more.
      </p>

      {loggedIn ? (
        <>
          <Button onClick={accept} loading={busy} fullWidth className="mt-8">
            Accept invite
          </Button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      ) : (
        <div className="mt-8 space-y-3">
          <Link
            href={`/signup?next=/invite/${token}`}
            className="tap block w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white active:bg-brand-700"
          >
            Sign up to accept
          </Link>
          <Link
            href={`/login?next=/invite/${token}`}
            className="tap block w-full rounded-xl border border-gray-300 py-3.5 font-semibold text-gray-700"
          >
            I already have an account
          </Link>
        </div>
      )}
    </div>
  );
}
