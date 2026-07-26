"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { ALL_EVENT_TYPES, EVENT_DEFS, EventType } from "@/lib/events";
import { toLocalInput, fromLocalInput } from "@/lib/format";
import { FieldSpec, DETAIL_FIELDS, fieldDisplayValue, applyField } from "@/lib/detailFields";
import { Button } from "@/app/components/ui";

type EventRow = {
  id: string;
  type: EventType;
  start_time: string;
  end_time: string | null;
  data: any;
  note: string | null;
  created_by_name?: string;
};

// A working row in the grid. id === null means it's a new, unsaved row.
type Row = {
  key: string;
  id: string | null;
  type: EventType;
  start: string; // datetime-local value
  end: string; // datetime-local value or ""
  data: any;
  note: string;
  loggedBy: string;
  dirty: boolean;
  isNew: boolean;
};

function toRow(e: EventRow): Row {
  return {
    key: e.id,
    id: e.id,
    type: e.type,
    start: toLocalInput(e.start_time),
    end: e.end_time ? toLocalInput(e.end_time) : "",
    data: { ...(e.data ?? {}) },
    note: e.note ?? "",
    loggedBy: e.created_by_name ?? "",
    dirty: false,
    isNew: false,
  };
}

let tmpCounter = 0;

export default function EventsGrid({
  childId,
  childName,
  initialEvents,
}: {
  childId: string;
  childName: string;
  initialEvents: EventRow[];
}) {
  const [rows, setRows] = useState<Row[]>(() => initialEvents.map(toRow));
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dirtyCount = useMemo(
    () => rows.filter((r) => r.dirty || r.isNew).length + deletedIds.length,
    [rows, deletedIds]
  );

  // Display rows sorted by start time (newest first), recomputed live as rows
  // are added/duplicated/edited. Rows are keyed, so an edited field keeps focus
  // even when its row moves. Stable sort keeps equal-time rows in insert order.
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ta = a.start ? new Date(a.start).getTime() : Infinity;
      const tb = b.start ? new Date(b.start).getTime() : Infinity;
      return tb - ta;
    });
  }, [rows]);

  function patchRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, dirty: true } : r)));
    setSavedAt(null);
  }

  function setDetail(key: string, f: FieldSpec, raw: string) {
    setRows((rs) =>
      rs.map((r) => (r.key === key ? { ...r, data: applyField(r.data, f, raw), dirty: true } : r))
    );
    setSavedAt(null);
  }

  function addRow() {
    const now = toLocalInput(new Date().toISOString());
    setRows((rs) => [
      { key: `tmp-${tmpCounter++}`, id: null, type: "feed_bottle", start: now, end: "", data: {}, note: "", loggedBy: "", dirty: false, isNew: true },
      ...rs,
    ]);
    setSavedAt(null);
  }

  // Clone a row (type, times, details, note) as a new unsaved row right below —
  // fast way to add many similar entries; just tweak what differs.
  function duplicateRow(key: string) {
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.key === key);
      if (idx < 0) return rs;
      const src = rs[idx];
      const copy: Row = {
        ...src,
        key: `tmp-${tmpCounter++}`,
        id: null,
        data: { ...src.data },
        loggedBy: "",
        dirty: false,
        isNew: true,
      };
      const next = [...rs];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setSavedAt(null);
  }

  function removeRow(key: string) {
    setRows((rs) => {
      const row = rs.find((r) => r.key === key);
      if (row?.id) setDeletedIds((d) => [...d, row.id!]);
      return rs.filter((r) => r.key !== key);
    });
    setSelected((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
    setSavedAt(null);
  }

  function deleteSelected() {
    selected.forEach((key) => removeRow(key));
    setSelected(new Set());
  }

  function toggleSelect(key: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const newRows = rows.filter((r) => r.isNew);
      const creates = newRows.map((r) => ({
        type: r.type,
        start_time: fromLocalInput(r.start),
        end_time: r.end ? fromLocalInput(r.end) : null,
        data: r.data,
        note: r.note || null,
      }));
      const updates = rows
        .filter((r) => !r.isNew && r.dirty)
        .map((r) => ({
          id: r.id!,
          type: r.type,
          start_time: fromLocalInput(r.start),
          end_time: r.end ? fromLocalInput(r.end) : null,
          data: r.data,
          note: r.note || null,
        }));

      const res = await api<{ created: EventRow[]; updated: EventRow[]; deleted: string[] }>(
        `/api/children/${childId}/events/batch`,
        { json: { creates, updates, deletes: deletedIds } }
      );

      // stamp created ids back onto the new rows (same order as sent)
      setRows((rs) => {
        let ci = 0;
        return rs.map((r) => {
          if (r.isNew) {
            const created = res.created[ci++];
            return created ? { ...toRow(created) } : r;
          }
          return { ...r, dirty: false };
        });
      });
      setDeletedIds([]);
      setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white text-sm">
      {/* header */}
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <Link href={`/child/${childId}`} className="tap text-gray-500 active:text-gray-700">
          ‹ Timeline
        </Link>
        <div className="text-center">
          <h1 className="font-bold leading-tight">{childName} · All entries</h1>
          <span className="text-xs text-gray-400">
            {dirtyCount > 0 ? `${dirtyCount} unsaved change${dirtyCount > 1 ? "s" : ""}` : savedAt ? `saved ${savedAt}` : `${rows.length} entries`}
          </span>
        </div>
        <Button size="sm" onClick={save} loading={saving} disabled={dirtyCount === 0}>
          Save
        </Button>
      </header>

      {/* toolbar */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
        <button onClick={addRow} className="tap rounded-lg border border-brand-300 px-3 py-1.5 font-medium text-brand-700 active:bg-brand-50">
          + Add row
        </button>
        {selected.size > 0 && (
          <Button variant="danger" size="sm" onClick={deleteSelected}>
            Delete {selected.size}
          </Button>
        )}
        {err && <span className="ml-auto text-xs text-red-600">{err}</span>}
      </div>

      {/* table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-8 px-2 py-2"></th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Start</th>
              <th className="px-2 py-2">End</th>
              <th className="px-2 py-2">Details</th>
              <th className="px-2 py-2">Note</th>
              <th className="px-2 py-2">By</th>
              <th className="w-14 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => {
              const def = EVENT_DEFS[r.type];
              const fields = DETAIL_FIELDS[r.type] ?? [];
              const rowBg = r.isNew ? "bg-emerald-50" : r.dirty ? "bg-amber-50" : "";
              return (
                <tr key={r.key} className={`border-b border-gray-100 ${rowBg}`}>
                  <td className="px-2 py-1.5">
                    <input type="checkbox" checked={selected.has(r.key)} onChange={() => toggleSelect(r.key)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={r.type}
                      onChange={(e) => patchRow(r.key, { type: e.target.value as EventType, data: {} })}
                      className="rounded border border-gray-200 bg-white px-1.5 py-1"
                    >
                      {ALL_EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {EVENT_DEFS[t].emoji} {EVENT_DEFS[t].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="datetime-local"
                      value={r.start}
                      onChange={(e) => patchRow(r.key, { start: e.target.value })}
                      className="rounded border border-gray-200 px-1.5 py-1"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {def.kind === "duration" ? (
                      <input
                        type="datetime-local"
                        value={r.end}
                        onChange={(e) => patchRow(r.key, { end: e.target.value })}
                        className="rounded border border-gray-200 px-1.5 py-1"
                      />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {fields.length === 0 && <span className="text-gray-300">—</span>}
                      {fields.map((f) => (
                        <span key={f.key} className="inline-flex items-center gap-0.5">
                          {f.label && <span className="text-xs text-gray-400">{f.label}</span>}
                          {f.kind === "select" ? (
                            <select
                              value={String(fieldDisplayValue(r.data, f))}
                              onChange={(e) => setDetail(r.key, f, e.target.value)}
                              className="rounded border border-gray-200 bg-white px-1.5 py-1"
                            >
                              <option value=""></option>
                              {f.options.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={f.kind === "number" ? "number" : "text"}
                              value={String(fieldDisplayValue(r.data, f))}
                              onChange={(e) => setDetail(r.key, f, e.target.value)}
                              className={`rounded border border-gray-200 px-1.5 py-1 ${f.kind === "number" ? "w-16" : "w-28"}`}
                            />
                          )}
                          {f.kind === "number" && "unit" in f && f.unit && <span className="text-xs text-gray-400">{f.unit}</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={r.note}
                      onChange={(e) => patchRow(r.key, { note: e.target.value })}
                      className="w-32 rounded border border-gray-200 px-1.5 py-1"
                      placeholder="—"
                    />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-xs text-gray-400">{r.loggedBy || (r.isNew ? "you (new)" : "")}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => duplicateRow(r.key)}
                        className="tap text-gray-400 active:text-brand-600"
                        title="Duplicate row"
                      >
                        ⧉
                      </button>
                      <button onClick={() => removeRow(r.key)} className="tap text-gray-300 active:text-red-500" title="Delete row">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-gray-400">No entries. Tap “+ Add row” to start.</p>}
      </div>
    </div>
  );
}
