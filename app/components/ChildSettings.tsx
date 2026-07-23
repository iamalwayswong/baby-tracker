"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

type Caregiver = { id: string; name: string; email: string; role: string };

export default function ChildSettings({
  child,
  role,
  caregivers,
}: {
  child: { id: string; name: string };
  role: string;
  caregivers: Caregiver[];
}) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { url } = await api<{ url: string }>(`/api/children/${child.id}/invite`, { json: { email } });
      setInviteUrl(url);
      setEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="px-5 py-6">
      <Link href={`/child/${child.id}`} className="tap text-gray-400 active:text-gray-600">
        ‹ Back
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">{child.name} · Caregivers</h1>

      <div className="space-y-2">
        {caregivers.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-2xl border border-gray-200 p-4">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">{c.email}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-600">{c.role}</span>
          </div>
        ))}
      </div>

      {role === "owner" ? (
        <div className="mt-8">
          <h2 className="mb-2 font-semibold">Invite the other parent</h2>
          <form onSubmit={invite} className="flex gap-2">
            <input
              type="email"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3"
              placeholder="their@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              disabled={busy}
              className="tap rounded-xl bg-indigo-600 px-5 font-semibold text-white active:bg-indigo-700 disabled:opacity-50"
            >
              Invite
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {inviteUrl && (
            <div className="mt-4 rounded-2xl bg-indigo-50 p-4">
              <p className="text-sm text-gray-600">Share this link with them:</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs">{inviteUrl}</code>
                <button onClick={copy} className="tap rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-400">Link expires in 7 days.</p>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-8 text-sm text-gray-400">Only the owner can invite more caregivers.</p>
      )}
    </div>
  );
}
