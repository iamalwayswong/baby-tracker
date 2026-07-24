"use client";
import { useState } from "react";
import { EVENT_DEFS, EventType } from "@/lib/events";
import { Button, ChoiceChips, Sheet, Stepper, TextInput } from "@/app/components/ui";

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
    <Sheet onClose={onClose} title={`${def.emoji} ${def.label}`}>
      <Body type={type} data={data} setData={setData} />
      <TextInput
        className="mt-4 text-sm"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button fullWidth loading={saving} onClick={save} className="mt-4">
        Log it
      </Button>
    </Sheet>
  );
}

function Body({ type, data, setData }: { type: EventType; data: any; setData: (d: any) => void }) {
  const set = (patch: any) => setData({ ...data, ...patch });

  switch (type) {
    case "diaper":
      return <ChoiceChips options={["wet", "dirty", "mixed"]} value={data.kind} onChange={(v) => set({ kind: v })} />;
    case "feed_bottle":
      return (
        <div className="space-y-3">
          <Stepper label="Amount" value={data.volume_ml ?? 60} step={10} unit="ml" onChange={(v) => set({ volume_ml: v })} />
          <ChoiceChips options={["breastmilk", "formula", "mixed"]} value={data.contents} onChange={(v) => set({ contents: v })} />
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
          <TextInput
            placeholder="Foods (e.g. banana, oatmeal)"
            onChange={(e) => set({ foods: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
          <ChoiceChips options={["taste", "some", "lots"]} value={data.amount} onChange={(v) => set({ amount: v })} />
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
          <TextInput placeholder="Medicine name" onChange={(e) => set({ name: e.target.value })} />
          <TextInput placeholder="Dose (e.g. 2.5 ml)" onChange={(e) => set({ dose: e.target.value })} />
        </div>
      );
    case "temperature":
      return <Stepper label="Temp" value={data.celsius ?? 37} step={1} unit="°C" onChange={(v) => set({ celsius: v })} />;
    default:
      return <p className="text-center text-sm text-gray-500">Tap “Log it” to record.</p>;
  }
}
