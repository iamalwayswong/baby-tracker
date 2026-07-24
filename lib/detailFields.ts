// Type-specific detail fields for an event's `data`, shared by the events grid
// and the timeline edit sheet. Pure (no React) so both can import it.
import { EventType } from "./events";

export type FieldSpec =
  | { key: string; label: string; kind: "number"; unit?: string; scale?: number }
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "select"; options: string[] };

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
  diaper: [{ key: "kind", label: "", kind: "select", options: ["wet", "dirty", "mixed"] }],
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
