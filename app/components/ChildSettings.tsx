"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Card, ChoiceChips, ConfirmModal, Field, TextInput } from "@/app/components/ui";
import ThemeToggle from "@/app/components/ThemeToggle";

type Caregiver = { id: string; name: string; email: string; role: string };
type Invite = { id: string; email: string; expiresAt: string; url: string; emailed?: boolean };
type Child = { id: string; name: string; birth_date: string | null; sex: string };

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
  child: Child;
  role: string;
  caregivers: Caregiver[];
  initialInvites: Invite[];
}) {
  const router = useRouter();
  // edit-details form
  const [name, setName] = useState(child.name);
  const [birthDate, setBirthDate] = useState(child.birth_date ? child.birth_date.slice(0, 10) : "");
  const [sex, setSex] = useState(child.sex);
  const [savingChild, setSavingChild] = useState(false);
  const [savedChild, setSavedChild] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const detailsDirty =
    name !== child.name ||
    birthDate !== (child.birth_date ? child.birth_date.slice(0, 10) : "") ||
    sex !== child.sex;

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

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingChild(true);
    setError(null);
    try {
      await api(`/api/children/${child.id}`, {
        method: "PATCH",
        json: { name, birth_date: birthDate || null, sex },
      });
      setSavedChild(true);
      setTimeout(() => setSavedChild(false), 1500);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingChild(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      await api(`/api/children/${child.id}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="px-5 py-6">
      <Link href={`/child/${child.id}`} className="tap text-ink-faint active:text-ink-soft">
        ‹ Back
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">{child.name} · Settings</h1>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Appearance</h2>
      <ThemeToggle />
      <p className="mb-8 mt-2 text-xs text-ink-faint">Dark by default — easier on the eyes for night feeds.</p>

      {/* Edit details */}
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Details</h2>
      <Card>
        <form onSubmit={saveDetails} className="space-y-3">
          <Field label="Name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Birthday">
            <TextInput type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
          <ChoiceChips options={["female", "male", "unspecified"]} value={sex} onChange={setSex} />
          <Button type="submit" fullWidth loading={savingChild} disabled={!detailsDirty}>
            {savedChild ? "Saved!" : "Save details"}
          </Button>
        </form>
      </Card>

      <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-ink-faint">Caregivers</h2>

      <div className="space-y-2">
        {caregivers.map((c) => (
          <Card key={c.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-ink-soft">{c.email}</p>
            </div>
            <span className="rounded-full bg-surface-muted px-3 py-1 text-xs capitalize text-ink-soft">{c.role}</span>
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
          {invites.length > 0 &&
            (invites[0]?.emailed ? (
              <p className="mt-2 text-xs text-emerald-600">✓ Emailed the invite — you can also copy the link below.</p>
            ) : (
              <p className="mt-2 text-xs text-ink-faint">Copy the link below and send it to them.</p>
            ))}

          {invites.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Active invite links ({invites.length})
              </h3>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <Card key={inv.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{inv.email}</p>
                      <p className="text-xs text-ink-faint">{daysLeft(inv.expiresAt)}</p>
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
        <p className="mt-8 text-sm text-ink-faint">Only the owner can invite more caregivers.</p>
      )}

      {role === "owner" && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-400">Danger zone</h2>
          <Button variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
            Delete {child.name}
          </Button>
          <p className="mt-2 text-xs text-ink-faint">
            Permanently removes {child.name} and all logged entries. This can&apos;t be undone.
          </p>
        </div>
      )}

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
      {confirmDelete && (
        <ConfirmModal
          title={`Delete ${child.name}?`}
          message="Every logged entry for this child will be permanently deleted. This can't be undone."
          confirmLabel="Delete forever"
          tone="danger"
          loading={deleting}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
