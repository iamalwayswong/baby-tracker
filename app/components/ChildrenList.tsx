"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";

type Child = { id: string; name: string; birth_date: string | null; sex: string; role: string };

export default function ChildrenList({
  userName,
  initialChildren,
}: {
  userName: string;
  initialChildren: Child[];
}) {
  const router = useRouter();
  const [children] = useState<Child[]>(initialChildren);
  const [adding, setAdding] = useState(initialChildren.length === 0);
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
      // jump straight into the kid you just created
      router.push(`/child/${child.id}`);
      router.refresh();
      return;
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
          <Link
            key={c.id}
            href={`/child/${c.id}`}
            className="tap flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 active:bg-gray-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-2xl">
              👶
            </span>
            <div className="flex-1">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-gray-500">
                {c.birth_date ? new Date(c.birth_date).toLocaleDateString() : "No birthday set"}
                {c.role === "owner" ? " · owner" : " · caregiver"}
              </p>
            </div>
            <span className="text-gray-300">›</span>
          </Link>
        ))}
      </div>

      {adding ? (
        <form onSubmit={addChild} className="mt-6 space-y-3 rounded-2xl border border-gray-200 p-4">
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            placeholder="Child's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="block text-sm text-gray-600">
            Birthday
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            {["female", "male", "unspecified"].map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setSex(s)}
                className={`tap flex-1 rounded-xl border py-2 text-sm capitalize ${
                  sex === s ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            disabled={busy}
            className="tap w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white active:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "…" : "Add child"}
          </button>
        </form>
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
