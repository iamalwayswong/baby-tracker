"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Card, TextInput } from "@/app/components/ui";

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
  const router = useRouter();
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
          <Card key={c.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-500">{c.email}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-600">{c.role}</span>
          </Card>
        ))}
      </div>

      {role === "owner" ? (
        <div className="mt-8">
          <h2 className="mb-2 font-semibold">Invite the other parent</h2>
          <form onSubmit={invite} className="flex gap-2">
            <TextInput
              type="email"
              className="flex-1"
              placeholder="their@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" loading={busy}>
              Invite
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {inviteUrl && (
            <div className="mt-4 rounded-2xl bg-brand-50 p-4">
              <p className="text-sm text-gray-600">Share this link with them:</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs">{inviteUrl}</code>
                <Button size="sm" onClick={copy}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-400">Link expires in 7 days.</p>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-8 text-sm text-gray-400">Only the owner can invite more caregivers.</p>
      )}

      <div className="mt-10 border-t border-gray-100 pt-6">
        <button
          onClick={async () => {
            await api("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
          }}
          className="tap text-sm font-medium text-gray-400 active:text-gray-600"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
