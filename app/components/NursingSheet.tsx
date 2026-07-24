"use client";
import { useEffect, useRef, useState } from "react";
import { stopwatch, humanDuration } from "@/lib/format";
import type { Side } from "@/lib/events";

// Full-screen nursing timer. Tap L or R to run that side; tapping the active
// side pauses. We remember which side ended last so next time we can suggest
// starting on the *other* side (the Huckleberry-style "which boob" nudge).
export default function NursingSheet({
  suggestedSide,
  onSave,
  onClose,
}: {
  suggestedSide: Side;
  onSave: (payload: { start_time: string; end_time: string; data: any }) => Promise<void>;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(0);
  const [active, setActive] = useState<Side | null>(null);
  const [lastSide, setLastSide] = useState<Side | null>(null);
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
    setActive((cur) => {
      const next = cur === side ? null : side;
      if (cur === side) setLastSide(side); // pausing this side => it was last active
      else setLastSide(side);
      return next;
    });
  }

  async function save() {
    if (left === 0 && right === 0) return onClose();
    setSaving(true);
    try {
      await onSave({
        start_time: startedAt ?? new Date().toISOString(),
        end_time: new Date().toISOString(),
        data: { left_seconds: left, right_seconds: right, last_side: lastSide ?? suggestedSide },
      });
    } finally {
      setSaving(false);
    }
  }

  const total = left + right;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-rose-50 px-5 py-6">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="tap text-gray-500 active:text-gray-700">
          Cancel
        </button>
        <span className="font-semibold text-rose-600">🤱 Nursing</span>
        <button
          onClick={save}
          disabled={saving}
          className="tap font-semibold text-rose-600 active:text-rose-800 disabled:opacity-40"
        >
          {saving ? "…" : "Save"}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">Total</p>
      <p className="text-center text-5xl font-bold tabular-nums">{stopwatch(total)}</p>

      <div className="mt-8 grid flex-1 grid-cols-2 gap-4">
        <SideButton
          side="left"
          label="Left"
          seconds={left}
          active={active === "left"}
          suggested={suggestedSide === "left" && total === 0}
          onTap={() => tap("left")}
        />
        <SideButton
          side="right"
          label="Right"
          seconds={right}
          active={active === "right"}
          suggested={suggestedSide === "right" && total === 0}
          onTap={() => tap("right")}
        />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {active ? "Tap the running side to pause" : "Tap a side to start the timer"}
      </p>
    </div>
  );
}

function SideButton({
  label,
  seconds,
  active,
  suggested,
  onTap,
}: {
  side: Side;
  label: string;
  seconds: number;
  active: boolean;
  suggested: boolean;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className={`tap relative flex flex-col items-center justify-center rounded-3xl border-2 text-center transition-colors ${
        active
          ? "border-rose-500 bg-rose-500 text-white"
          : "border-rose-200 bg-white text-rose-700 active:bg-rose-100"
      }`}
    >
      {suggested && (
        <span className="absolute top-3 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">
          start here
        </span>
      )}
      <span className="text-lg font-semibold">{label}</span>
      <span className="mt-1 text-3xl font-bold tabular-nums">{stopwatch(seconds)}</span>
      {seconds > 0 && <span className="mt-1 text-xs opacity-70">{humanDuration(seconds)}</span>}
      {active && <span className="mt-2 text-xs">● running</span>}
    </button>
  );
}
