"use client";
import { useEffect, useState } from "react";
import { stopwatch, humanDuration } from "@/lib/format";
import { Side, SIDE, liveNursing } from "@/lib/events";

type EventRow = {
  id: string;
  type: string;
  start_time: string;
  end_time: string | null;
  data: any;
};

// Full-screen nursing timer, backed by a server-side in-progress feed_breast.
// Elapsed is computed from stored timestamps (via liveNursing), so it stays
// correct across backgrounding / app close, and you can close this sheet and
// keep nursing running in the background (an in-progress banner appears).
export default function NursingSheet({
  session,
  suggestedSide,
  lastSide,
  onSide,
  onSave,
  onDiscard,
  onClose,
}: {
  session: EventRow | null;
  suggestedSide: Side;
  lastSide: Side | null;
  onSide: (side: Side) => void; // parent starts/switches/pauses on the server
  onSave: () => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
  onClose: () => void; // minimize — keep running in the background
}) {
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const { left, right, active } = session
    ? liveNursing(session.data, now)
    : { left: 0, right: 0, active: null as Side | null };
  const total = left + right;
  const started = total > 0 || !!session;

  async function save() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-white px-5 py-6">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="tap text-gray-500 active:text-gray-700">
          {session ? "Minimize" : "Close"}
        </button>
        <span className="font-semibold text-gray-800">🤱 Nursing</span>
        <button
          onClick={save}
          disabled={saving || total < 1}
          className="tap font-semibold text-brand-600 active:text-brand-800 disabled:opacity-40"
        >
          {saving ? "…" : "Save"}
        </button>
      </div>

      {/* last side / start hint */}
      <div className="mt-5 rounded-2xl bg-gray-50 p-3 text-center text-sm">
        {session ? (
          <span className="text-gray-500">Running in the background — you can close this and come back.</span>
        ) : lastSide ? (
          <>
            <span className="text-gray-500">Last time: </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SIDE[lastSide].soft}`}>{SIDE[lastSide].label}</span>
            <span className="text-gray-500"> · start on </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SIDE[suggestedSide].soft}`}>{SIDE[suggestedSide].label}</span>
          </>
        ) : (
          <span className="text-gray-500">First feed — start on either side</span>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">Total</p>
      <p className="text-center text-5xl font-bold tabular-nums">{stopwatch(total)}</p>

      <div className="mt-8 grid flex-1 grid-cols-2 gap-4">
        <SideButton side="left" seconds={left} active={active === "left"} suggested={suggestedSide === "left" && !started} onTap={() => onSide("left")} />
        <SideButton side="right" seconds={right} active={active === "right"} suggested={suggestedSide === "right" && !started} onTap={() => onSide("right")} />
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {active ? "Tap the running side to pause" : "Tap a side to start the timer"}
      </p>

      {session && (
        <button onClick={() => onDiscard()} className="tap mt-3 text-center text-sm font-medium text-red-500 active:text-red-700">
          Discard this session
        </button>
      )}
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
      <span className="mt-1 text-3xl font-bold tabular-nums">{stopwatch(seconds)}</span>
      {seconds > 0 && <span className="mt-1 text-xs opacity-70">{humanDuration(seconds)}</span>}
      {active && <span className="mt-2 text-xs">● running</span>}
    </button>
  );
}
