"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Card, ConfirmModal, TextInput } from "@/app/components/ui";

type Caregiver = { id: string; name: string; email: string; role: string };
type Invite = { id: string; email: string; expiresAt: string; url: string };

function daysLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return d <= 1 ? "expires soon" : `expires in ${d}d`;
}

export default function ChildSettings({
  child,
  role,
  caregivers,
  initialInvites,
}: {
  child: { id: string; name: string };
  role: string;
  caregivers: Caregiver[];
  initialInvites: Invite[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Invite | null>(null);
  const [revBusy, setRevBusy] = useState(false);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const created = await api<Invite>(`/api/children/${child.id}/invite`, { json: { email } });
      setInvites((list) => [created, ...list]);
      setEmail("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy(inv: Invite) {
    await navigator.clipboard.writeText(inv.url);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId((c) => (c === inv.id ? null : c)), 1500);
  }

  async function doRevoke() {
    if (!revoking) return;
    setRevBusy(true);
    try {
      await api(`/api/children/${child.id}/invite/${revoking.id}`, { method: "DELETE" });
      setInvites((list) => list.filter((i) => i.id !== revoking.id));
      setRevoking(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRevBusy(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
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
          <p className="mt-2 text-xs text-gray-400">We don&apos;t email it — copy the link and send it to them.</p>

          {invites.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Active invite links ({invites.length})
              </h3>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <Card key={inv.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{inv.email}</p>
                      <p className="text-xs text-gray-400">{daysLeft(inv.expiresAt)}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => copy(inv)}>
                      {copiedId === inv.id ? "Copied!" : "Copy link"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setRevoking(inv)}>
                      Revoke
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-8 text-sm text-gray-400">Only the owner can invite more caregivers.</p>
      )}

      <div className="mt-10 border-t border-gray-100 pt-6">
        <button onClick={logout} className="tap text-sm font-medium text-gray-400 active:text-gray-600">
          Log out
        </button>
      </div>

      {revoking && (
        <ConfirmModal
          title="Revoke this invite?"
          message={`The link sent to ${revoking.email} will stop working immediately.`}
          confirmLabel="Revoke"
          tone="danger"
          loading={revBusy}
          onConfirm={doRevoke}
          onCancel={() => setRevoking(null)}
        />
      )}
    </div>
  );
}
