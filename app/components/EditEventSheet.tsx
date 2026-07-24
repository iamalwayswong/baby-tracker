"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { EVENT_DEFS, EventType } from "@/lib/events";
import { toLocalInput, fromLocalInput } from "@/lib/format";
import { detailFieldsFor, fieldDisplayValue, applyField } from "@/lib/detailFields";

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
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full rounded-t-3xl bg-white px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-300" />
        <h2 className="mb-4 text-center text-lg font-semibold">
          Edit {def.emoji} {def.label}
        </h2>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-gray-600">Start</span>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
          />
        </label>

        {def.kind === "duration" && (
          <label className="mb-3 block text-sm">
            <span className="mb-1 block text-gray-600">End {end ? "" : "(in progress)"}</span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5"
            />
          </label>
        )}

        {fields.length > 0 && (
          <div className="mb-3 flex flex-wrap items-end gap-3">
            {fields.map((f) => (
              <label key={f.key} className="text-sm">
                <span className="mb-1 block capitalize text-gray-600">{f.label || f.key.replace(/_/g, " ")}</span>
                {f.kind === "select" ? (
                  <select
                    value={String(fieldDisplayValue(data, f))}
                    onChange={(e) => setData(applyField(data, f, e.target.value))}
                    className="rounded-xl border border-gray-300 px-3 py-2.5"
                  >
                    <option value=""></option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <input
                      type={f.kind === "number" ? "number" : "text"}
                      value={String(fieldDisplayValue(data, f))}
                      onChange={(e) => setData(applyField(data, f, e.target.value))}
                      className={`rounded-xl border border-gray-300 px-3 py-2.5 ${f.kind === "number" ? "w-24" : "w-40"}`}
                    />
                    {f.kind === "number" && "unit" in f && f.unit && <span className="text-xs text-gray-400">{f.unit}</span>}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}

        <input
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="tap mt-4 w-full rounded-xl bg-indigo-600 py-3.5 font-semibold text-white active:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
