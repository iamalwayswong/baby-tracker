// Type-specific detail fields for an event's `data`, shared by the events grid
// and the timeline edit sheet. Pure (no React) so both can import it.
import { EventType, diaperKinds } from "./events";

export type FieldSpec =
  | { key: string; label: string; kind: "number"; unit?: string; scale?: number }
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "select"; options: string[] }
  // Multi-select toggle pills. Each option's value is stored as a boolean on
  // `data` (e.g. data.pee / data.poop), so more than one can be on at once.
  // An `all: true` option is a shortcut (e.g. "Both") — it's never stored; it
  // lights up when every real option is on and toggles them all at once.
  | { key: string; label: string; kind: "multi"; options: { value: string; label: string; all?: boolean }[] };

export const DETAIL_FIELDS: Partial<Record<EventType, FieldSpec[]>> = {
  feed_breast: [
    { key: "left_seconds", label: "L", kind: "number", unit: "m", scale: 60 },
    { key: "right_seconds", label: "R", kind: "number", unit: "m", scale: 60 },
  ],
  feed_bottle: [
    { key: "volume_ml", label: "", kind: "number", unit: "ml" },
    { key: "contents", label: "", kind: "select", options: ["breastmilk", "formula", "mixed"] },
  ],
  feed_solid: [{ key: "foods", label: "foods", kind: "text" }],
  pump: [
    { key: "left_ml", label: "L", kind: "number", unit: "ml" },
    { key: "right_ml", label: "R", kind: "number", unit: "ml" },
  ],
  diaper: [
    {
      key: "diaper",
      label: "",
      kind: "multi",
      options: [
        { value: "pee", label: "Pee" },
        { value: "poop", label: "Poop" },
        { value: "both", label: "Both", all: true },
      ],
    },
  ],
  growth: [
    { key: "weight_g", label: "wt", kind: "number", unit: "g" },
    { key: "height_cm", label: "ht", kind: "number", unit: "cm" },
    { key: "head_cm", label: "head", kind: "number", unit: "cm" },
  ],
  medicine: [
    { key: "name", label: "", kind: "text" },
    { key: "dose", label: "dose", kind: "text" },
  ],
  temperature: [{ key: "celsius", label: "°C", kind: "number" }],
};

export function detailFieldsFor(type: EventType): FieldSpec[] {
  return DETAIL_FIELDS[type] ?? [];
}

/** Value to show in an input for field `f`, given the stored `data`. */
export function fieldDisplayValue(data: any, f: FieldSpec): string {
  let v = data?.[f.key];
  if (f.key === "foods") return Array.isArray(v) ? v.join(", ") : "";
  if (f.kind === "number" && typeof v === "number" && "scale" in f && f.scale) v = v / f.scale;
  return v ?? "";
}

/** Returns a new `data` object with field `f` set from raw input text. */
export function applyField(data: any, f: FieldSpec, raw: string): any {
  const next = { ...data };
  if (f.key === "foods") {
    next.foods = raw.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (f.kind === "number") {
    const scale = "scale" in f && f.scale ? f.scale : 1;
    next[f.key] = raw === "" ? undefined : Number(raw) * scale;
  } else {
    next[f.key] = raw || undefined;
  }
  return next;
}

// Whether an individual option is on. Diaper is the only multi field, so we
// route pee/poop through diaperKinds to also honor legacy `kind`-shaped events.
function optionOn(data: any, value: string): boolean {
  const { pee, poop } = diaperKinds(data);
  if (value === "pee") return pee;
  if (value === "poop") return poop;
  return !!data?.[value];
}

/** Selected option values for a multi field, including any lit `all` shortcut. */
export function multiSelected(data: any, f: Extract<FieldSpec, { kind: "multi" }>): string[] {
  const real = f.options.filter((o) => !o.all);
  const active = real.filter((o) => optionOn(data, o.value)).map((o) => o.value);
  const allOn = real.length > 0 && active.length === real.length;
  // An `all` shortcut (e.g. "Both") lights up only when every real option is on.
  const shortcuts = allOn ? f.options.filter((o) => o.all).map((o) => o.value) : [];
  return [...active, ...shortcuts];
}

/** Toggle one option of a multi field on/off, migrating off any legacy `kind`. */
export function toggleMulti(data: any, f: Extract<FieldSpec, { kind: "multi" }>, value: string): any {
  const real = f.options.filter((o) => !o.all);
  const selected = new Set(real.filter((o) => optionOn(data, o.value)).map((o) => o.value));
  const opt = f.options.find((o) => o.value === value);
  if (opt?.all) {
    // Shortcut: if everything's already on, clear all; otherwise select all.
    const allOn = real.every((o) => selected.has(o.value));
    real.forEach((o) => (allOn ? selected.delete(o.value) : selected.add(o.value)));
  } else {
    selected.has(value) ? selected.delete(value) : selected.add(value);
  }
  const next = { ...data };
  delete next.kind; // materialized into booleans below; drop the legacy field
  for (const o of real) next[o.value] = selected.has(o.value) ? true : undefined;
  return next;
}
