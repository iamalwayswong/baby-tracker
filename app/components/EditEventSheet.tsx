"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { EVENT_DEFS, EventType } from "@/lib/events";
import { toLocalInput, fromLocalInput } from "@/lib/format";
import { detailFieldsFor, fieldDisplayValue, applyField } from "@/lib/detailFields";
import { Button, ChoiceChips, Field, Sheet, TextInput } from "@/app/components/ui";

type EventRow = {
  id: string;
  type: EventType;
  start_time: string;
  end_time: string | null;
  data: any;
  note: string | null;
  created_by: string;
  created_by_name?: string;
};

// Bottom sheet to edit one existing event: time(s), type-specific details, note.
export default function EditEventSheet({
  event,
  onSaved,
  onClose,
}: {
  event: EventRow;
  onSaved: (e: EventRow) => void;
  onClose: () => void;
}) {
  const def = EVENT_DEFS[event.type];
  const [start, setStart] = useState(toLocalInput(event.start_time));
  const [end, setEnd] = useState(event.end_time ? toLocalInput(event.end_time) : "");
  const [data, setData] = useState<any>({ ...(event.data ?? {}) });
  const [note, setNote] = useState(event.note ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fields = detailFieldsFor(event.type);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const { event: updated } = await api<{ event: EventRow }>(`/api/events/${event.id}`, {
        method: "PATCH",
        json: {
          start_time: fromLocalInput(start),
          end_time: def.kind === "duration" && end ? fromLocalInput(end) : null,
          data,
          note: note || null,
        },
      });
      onSaved({ ...updated, created_by_name: event.created_by_name });
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  }

  return (
    <Sheet onClose={onClose} title={`Edit ${def.emoji} ${def.label}`}>
      <div className="space-y-3">
        <Field label="Start">
          <TextInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>

        {def.kind === "duration" && (
          <Field label={`End${end ? "" : " (in progress)"}`}>
            <TextInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        )}

        {fields.map((f) => {
          const label = f.label || f.key.replace(/_/g, " ");
          if (f.kind === "select") {
            return (
              <Field key={f.key} label={label}>
                <ChoiceChips options={f.options} value={String(fieldDisplayValue(data, f))} onChange={(v) => setData(applyField(data, f, v))} />
              </Field>
            );
          }
          return (
            <Field key={f.key} label={f.kind === "number" && "unit" in f && f.unit ? `${label} (${f.unit})` : label}>
              <TextInput
                type={f.kind === "number" ? "number" : "text"}
                value={String(fieldDisplayValue(data, f))}
                onChange={(e) => setData(applyField(data, f, e.target.value))}
              />
            </Field>
          );
        })}

        <TextInput placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button fullWidth loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>
    </Sheet>
  );
}
