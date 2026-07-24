"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Card, ChoiceChips, Field, TextInput } from "@/app/components/ui";

type Child = { id: string; name: string; birth_date: string | null; sex: string; role: string };

export default function ChildrenList({
  userName,
  initialChildren,
  startAdding = false,
}: {
  userName: string;
  initialChildren: Child[];
  startAdding?: boolean;
}) {
  const router = useRouter();
  const [children] = useState<Child[]>(initialChildren);
  const [adding, setAdding] = useState(startAdding || initialChildren.length === 0);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("unspecified");
  const [busy, setBusy] = useState(false);

  async function addChild(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { child } = await api<{ child: Child }>("/api/children", {
        json: { name, birth_date: birthDate || null, sex },
      });
      router.push(`/child/${child.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Hi, {userName} 👋</p>
          <h1 className="text-2xl font-bold">Your children</h1>
        </div>
        <button onClick={logout} className="tap text-sm text-gray-400 active:text-gray-600">
          Log out
        </button>
      </div>

      <div className="space-y-3">
        {children.map((c) => (
          <Link key={c.id} href={`/child/${c.id}`} className="tap block active:opacity-70">
            <Card className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">👶</span>
              <div className="flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-gray-500">
                  {c.birth_date ? new Date(c.birth_date).toLocaleDateString() : "No birthday set"}
                  {c.role === "owner" ? " · owner" : " · caregiver"}
                </p>
              </div>
              <span className="text-gray-300">›</span>
            </Card>
          </Link>
        ))}
      </div>

      {adding ? (
        <Card className="mt-6 space-y-3">
          <form onSubmit={addChild} className="space-y-3">
            <TextInput placeholder="Child's name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Field label="Birthday">
              <TextInput type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
            <ChoiceChips options={["female", "male", "unspecified"]} value={sex} onChange={setSex} />
            <Button type="submit" fullWidth loading={busy}>
              Add child
            </Button>
          </form>
        </Card>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="tap mt-6 w-full rounded-2xl border-2 border-dashed border-gray-300 py-4 font-medium text-gray-500 active:bg-gray-50"
        >
          + Add a child
        </button>
      )}
    </div>
  );
}
