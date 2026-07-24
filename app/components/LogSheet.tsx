"use client";
import { useState } from "react";
import { EVENT_DEFS, EventType } from "@/lib/events";

// Bottom sheet for point-in-time events. Each type renders quick presets so
// logging is a couple of taps, with sensible defaults pre-selected.
export default function LogSheet({
  type,
  onSave,
  onClose,
}: {
  type: EventType;
  onSave: (payload: { data: any; note?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const def = EVENT_DEFS[type];
  const [data, setData] = useState<any>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave({ data, note: note || undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full rounded-t-3xl bg-white px-5 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />
        <h2 className="mb-4 text-center text-lg font-semibold">
          {def.emoji} {def.label}
        </h2>

        <Body type={type} data={data} setData={setData} />

        <input
          className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button
          onClick={save}
          disabled={saving}
          className="tap mt-4 w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white active:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "…" : "Log it"}
        </button>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`tap flex-1 rounded-xl border py-3 text-sm font-medium capitalize ${
        active ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({
  label,
  value,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-300 px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-3">
        <button className="tap h-8 w-8 rounded-full bg-gray-100 text-lg" onClick={() => onChange(Math.max(0, value - step))}>
          −
        </button>
        <span className="w-20 text-center font-semibold tabular-nums">
          {value} {unit}
        </span>
        <button className="tap h-8 w-8 rounded-full bg-gray-100 text-lg" onClick={() => onChange(value + step)}>
          +
        </button>
      </div>
    </div>
  );
}

function Body({ type, data, setData }: { type: EventType; data: any; setData: (d: any) => void }) {
  const set = (patch: any) => setData({ ...data, ...patch });

  switch (type) {
    case "diaper":
      return (
        <div className="flex gap-2">
          {["wet", "dirty", "mixed"].map((k) => (
            <Chip key={k} active={data.kind === k} onClick={() => set({ kind: k })}>
              {k}
            </Chip>
          ))}
        </div>
      );
    case "feed_bottle":
      return (
        <div className="space-y-3">
          <Stepper label="Amount" value={data.volume_ml ?? 60} step={10} unit="ml" onChange={(v) => set({ volume_ml: v })} />
          <div className="flex gap-2">
            {["breastmilk", "formula", "mixed"].map((c) => (
              <Chip key={c} active={data.contents === c} onClick={() => set({ contents: c })}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
      );
    case "pump":
      return (
        <div className="space-y-3">
          <Stepper label="Left" value={data.left_ml ?? 0} step={10} unit="ml" onChange={(v) => set({ left_ml: v })} />
          <Stepper label="Right" value={data.right_ml ?? 0} step={10} unit="ml" onChange={(v) => set({ right_ml: v })} />
        </div>
      );
    case "feed_solid":
      return (
        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            placeholder="Foods (e.g. banana, oatmeal)"
            onChange={(e) => set({ foods: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
          <div className="flex gap-2">
            {["taste", "some", "lots"].map((a) => (
              <Chip key={a} active={data.amount === a} onClick={() => set({ amount: a })}>
                {a}
              </Chip>
            ))}
          </div>
        </div>
      );
    case "growth":
      return (
        <div className="space-y-3">
          <Stepper label="Weight" value={data.weight_g ?? 3500} step={50} unit="g" onChange={(v) => set({ weight_g: v })} />
          <Stepper label="Height" value={data.height_cm ?? 50} step={1} unit="cm" onChange={(v) => set({ height_cm: v })} />
          <Stepper label="Head" value={data.head_cm ?? 35} step={1} unit="cm" onChange={(v) => set({ head_cm: v })} />
        </div>
      );
    case "medicine":
      return (
        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            placeholder="Medicine name"
            onChange={(e) => set({ name: e.target.value })}
          />
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            placeholder="Dose (e.g. 2.5 ml)"
            onChange={(e) => set({ dose: e.target.value })}
          />
        </div>
      );
    case "temperature":
      return (
        <Stepper label="Temp" value={data.celsius ?? 37} step={1} unit="°C" onChange={(v) => set({ celsius: v })} />
      );
    default:
      return <p className="text-center text-sm text-gray-500">Tap “Log it” to record.</p>;
  }
}
