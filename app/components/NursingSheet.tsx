"use client";
import { useEffect, useRef, useState } from "react";
import { Side, SIDE } from "@/lib/events";

// Nursing is measured in minutes — seconds are noise (usually a mis-tap), so
// the timer screen shows whole minutes.
function mins(seconds: number): number {
  return Math.round(seconds / 60);
}

// Full-screen nursing timer. Tap L or R to run that side; tapping the active
// side pauses. Left = blue, Right = pink. On open it reminds you which side you
// nursed last and highlights the side to start on next (the opposite one).
export default function NursingSheet({
  suggestedSide,
  lastSide,
  onSave,
  onClose,
}: {
  suggestedSide: Side;
  lastSide: Side | null;
  onSave: (payload: { start_time: string; end_time: string; data: any }) => Promise<void>;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [active, setActive] = useState<Side | null>(null);
  const [lastActive, setLastActive] = useState<Side | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      tick.current = setInterval(() => {
        if (active === "left") setLeft((s) => s + 1);
        else setRight((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [active]);

  function tap(side: Side) {
    if (!startedAt) setStartedAt(new Date().toISOString());
    setLastActive(side);
    setActive((cur) => (cur === side ? null : side));
  }

  async function save() {
    if (left === 0 && right === 0) return onClose();
    setSaving(true);
    try {
      await onSave({
        start_time: startedAt ?? new Date().toISOString(),
        end_time: new Date().toISOString(),
        data: { left_seconds: left, right_seconds: right, last_side: lastActive ?? suggestedSide },
      });
    } finally {
      setSaving(false);
    }
  }

  const total = left + right;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-white px-5 py-6">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="tap text-gray-500 active:text-gray-700">
          Cancel
        </button>
        <span className="font-semibold text-gray-800">🤱 Nursing</span>
        <button onClick={save} disabled={saving} className="tap font-semibold text-brand-600 active:text-brand-800 disabled:opacity-40">
          {saving ? "…" : "Save"}
        </button>
      </div>

      {/* which side last time + which to start on now */}
      <div className="mt-5 rounded-2xl bg-gray-50 p-3 text-center text-sm">
        {lastSide ? (
          <>
            <span className="text-gray-500">Last time: </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SIDE[lastSide].soft}`}>{SIDE[lastSide].label}</span>
            <span className="text-gray-500"> · start on </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SIDE[suggestedSide].soft}`}>{SIDE[suggestedSide].label}</span>
          </>
        ) : (
          <span className="text-gray-500">First feed logged — start on either side</span>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">Total</p>
      <p className="text-center text-5xl font-bold tabular-nums">
        {mins(total)}
        <span className="text-2xl font-semibold text-gray-400"> min</span>
      </p>

      <div className="mt-8 grid flex-1 grid-cols-2 gap-4">
        <SideButton side="left" seconds={left} active={active === "left"} suggested={suggestedSide === "left" && total === 0} onTap={() => tap("left")} />
        <SideButton side="right" seconds={right} active={active === "right"} suggested={suggestedSide === "right" && total === 0} onTap={() => tap("right")} />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {active ? "Tap the running side to pause" : "Tap a side to start the timer"}
      </p>
    </div>
  );
}

function SideButton({
  side,
  seconds,
  active,
  suggested,
  onTap,
}: {
  side: Side;
  seconds: number;
  active: boolean;
  suggested: boolean;
  onTap: () => void;
}) {
  const s = SIDE[side];
  return (
    <button
      onClick={onTap}
      className={`tap relative flex flex-col items-center justify-center rounded-3xl border-2 text-center transition-colors ${
        active ? `${s.solid} border-transparent text-white` : "border-gray-200 bg-white text-gray-700 active:bg-gray-50"
      }`}
    >
      {suggested && (
        <span className={`absolute top-3 rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-white/90 text-gray-700" : s.soft}`}>
          start here
        </span>
      )}
      <span className="text-lg font-semibold">{s.label}</span>
      <span className="mt-1 text-3xl font-bold tabular-nums">
        {mins(seconds)}
        <span className="text-lg font-semibold opacity-70"> min</span>
      </span>
      {active && <span className="mt-2 text-xs">● running</span>}
    </button>
  );
}
