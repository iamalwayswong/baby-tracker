"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { EVENT_DEFS, EventType } from "@/lib/events";
import { toLocalInput, fromLocalInput } from "@/lib/format";
import { detailFieldsFor, fieldDisplayValue, applyField } from "@/lib/detailFields";
import { Button, ChoiceChips, ConfirmModal, Field, Sheet, TextInput } from "@/app/components/ui";

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
// Save is disabled until something changes; closing with unsaved changes and
// deleting both go through custom in-app confirm modals.
export default function EditEventSheet({
  event,
  onSaved,
  onDeleted,
  onClose,
}: {
  event: EventRow;
  onSaved: (e: EventRow) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const def = EVENT_DEFS[event.type];
  const initial = useMemo(
    () => ({
      start: toLocalInput(event.start_time),
      end: event.end_time ? toLocalInput(event.end_time) : "",
      data: JSON.stringify(event.data ?? {}),
      note: event.note ?? "",
    }),
    [event]
  );

  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [data, setData] = useState<any>({ ...(event.data ?? {}) });
  const [note, setNote] = useState(initial.note);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "close" | "delete">(null);

  const fields = detailFieldsFor(event.type);
  const dirty =
    start !== initial.start || end !== initial.end || note !== initial.note || JSON.stringify(data) !== initial.data;

  // Close request: guard on unsaved changes.
  function requestClose() {
    if (dirty) setConfirm("close");
    else onClose();
  }

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

  async function doDelete() {
    setDeleting(true);
    setErr(null);
    try {
      await api(`/api/events/${event.id}`, { method: "DELETE" });
      onDeleted(event.id);
    } catch (e: any) {
      setErr(e.message);
      setDeleting(false);
      setConfirm(null);
    }
  }

  return (
    <>
      <Sheet onClose={requestClose} title={`Edit ${def.emoji} ${def.label}`}>
        <div className="space-y-3">
          <TimeField label="Start" value={start} onChange={setStart} />

          {def.kind === "duration" && (
            <TimeField label={`End${end ? "" : " (in progress)"}`} value={end} onChange={setEnd} allowEmpty />
          )}

          {fields.map((f) => {
            const label = f.label || f.key.replace(/_/g, " ");
            if (f.kind === "select") {
              return (
                <Field key={f.key} label={label}>
                  <ChoiceChips
                    options={f.options}
                    value={String(fieldDisplayValue(data, f))}
                    onChange={(v) => setData(applyField(data, f, v))}
                  />
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

          <Button fullWidth loading={saving} disabled={!dirty} onClick={save}>
            Save changes
          </Button>
          <Button fullWidth variant="destructive" onClick={() => setConfirm("delete")}>
            Delete entry
          </Button>
        </div>
      </Sheet>

      {confirm === "close" && (
        <ConfirmModal
          title="Discard changes?"
          message="You have unsaved changes. Leaving will lose them."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          tone="danger"
          onConfirm={onClose}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "delete" && (
        <ConfirmModal
          title="Delete this entry?"
          message="It will be removed from the timeline."
          confirmLabel="Delete"
          tone="danger"
          loading={deleting}
          onConfirm={doDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// Time is the primary control (you usually just nudge it); the date is a
// secondary action tucked behind "change date", with the current day shown
// for context. `value` is a datetime-local string ("YYYY-MM-DDTHH:mm").
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function TimeField({
  label,
  value,
  onChange,
  allowEmpty,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  const [showDate, setShowDate] = useState(false);
  const hasValue = !!value;
  const datePart = hasValue ? value.slice(0, 10) : todayLocal();
  const timePart = hasValue ? value.slice(11, 16) : "";
  const humanDate = hasValue
    ? new Date(value).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
    : "no date";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
          type="button"
          onClick={() => setShowDate((s) => !s)}
          className="tap text-xs font-medium text-brand-600 active:text-brand-800"
        >
          {humanDate} · {showDate ? "done" : "change date"}
        </button>
      </div>
      <TextInput
        type="time"
        value={timePart}
        onChange={(e) => {
          const t = e.target.value;
          if (!t && allowEmpty) return onChange("");
          onChange(`${datePart}T${t}`);
        }}
      />
      {showDate && (
        <TextInput
          type="date"
          className="mt-2"
          value={datePart}
          onChange={(e) => onChange(`${e.target.value}T${timePart || "00:00"}`)}
        />
      )}
    </div>
  );
}
