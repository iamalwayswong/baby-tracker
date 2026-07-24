"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Card, ConfirmModal } from "@/app/components/ui";

// Global, account-level settings (vs. per-child settings). Home for your
// account and app-wide preferences; child-specific caregivers/invites live on
// each child's own settings screen.
export default function AppSettings({ user }: { user: { name: string; email: string } }) {
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="px-5 py-6">
      <Link href="/" className="tap text-gray-400 active:text-gray-600">
        ‹ Back
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-bold">App settings</h1>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Account</h2>
      <Card>
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </Card>

      <p className="mt-6 text-sm text-gray-400">
        Caregivers and invites are managed per child — open a child and tap ⚙.
      </p>

      <div className="mt-8">
        <Button variant="danger" fullWidth onClick={() => setConfirmLogout(true)}>
          Log out
        </Button>
      </div>

      {confirmLogout && (
        <ConfirmModal
          title="Log out?"
          confirmLabel="Log out"
          tone="danger"
          loading={busy}
          onConfirm={logout}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </div>
  );
}
