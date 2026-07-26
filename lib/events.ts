// Shared tracker definitions used by both the UI and the API.
// Adding a new tracker = add an entry here (+ handle its `data` in the log sheet).
// The single `events` table means no migration is needed for a new type.

export type EventType =
  | "sleep"
  | "feed_breast"
  | "feed_bottle"
  | "feed_solid"
  | "pump"
  | "diaper"
  | "growth"
  | "medicine"
  | "temperature"
  | "activity"
  | "potty"
  | "milestone";

export interface EventDef {
  type: EventType;
  label: string;
  emoji: string;
  /** Duration events have a start/stop timer; point events happen at an instant. */
  kind: "duration" | "point";
  /** Show on the home quick-log bar (the one-tap common actions). */
  quick: boolean;
  color: string; // tailwind bg utility for the tile
}

export const EVENT_DEFS: Record<EventType, EventDef> = {
  sleep:        { type: "sleep",        label: "Sleep",       emoji: "😴", kind: "duration", quick: true,  color: "bg-indigo-500" },
  feed_breast:  { type: "feed_breast",  label: "Nursing",     emoji: "🤱", kind: "duration", quick: true,  color: "bg-rose-500" },
  feed_bottle:  { type: "feed_bottle",  label: "Bottle",      emoji: "🍼", kind: "point",    quick: true,  color: "bg-amber-500" },
  diaper:       { type: "diaper",       label: "Diaper",      emoji: "💩", kind: "point",    quick: true,  color: "bg-lime-600" },
  feed_solid:   { type: "feed_solid",   label: "Solids",      emoji: "🥣", kind: "point",    quick: false, color: "bg-orange-500" },
  pump:         { type: "pump",         label: "Pump",        emoji: "🥛", kind: "point",    quick: false, color: "bg-sky-500" },
  growth:       { type: "growth",       label: "Growth",      emoji: "📏", kind: "point",    quick: false, color: "bg-emerald-600" },
  medicine:     { type: "medicine",     label: "Medicine",    emoji: "💊", kind: "point",    quick: false, color: "bg-fuchsia-600" },
  temperature:  { type: "temperature",  label: "Temp",        emoji: "🌡️", kind: "point",    quick: false, color: "bg-red-500" },
  activity:     { type: "activity",     label: "Activity",    emoji: "🧸", kind: "duration", quick: false, color: "bg-teal-500" },
  potty:        { type: "potty",        label: "Potty",       emoji: "🚽", kind: "point",    quick: false, color: "bg-cyan-600" },
  milestone:    { type: "milestone",    label: "Milestone",   emoji: "⭐", kind: "point",    quick: false, color: "bg-yellow-500" },
};

export const ALL_EVENT_TYPES = Object.keys(EVENT_DEFS) as EventType[];
export const QUICK_EVENT_TYPES = ALL_EVENT_TYPES.filter((t) => EVENT_DEFS[t].quick);

export function isEventType(x: string): x is EventType {
  return x in EVENT_DEFS;
}

export type Side = "left" | "right";

// Per-side identity for nursing — Left = blue, Right = pink. Used for the
// colored L/R badges on the timeline and the buttons in the nursing sheet.
export const SIDE: Record<Side, { label: string; short: string; solid: string; soft: string }> = {
  left: { label: "Left", short: "L", solid: "bg-sky-500", soft: "bg-sky-100 text-sky-700" },
  right: { label: "Right", short: "R", solid: "bg-pink-500", soft: "bg-pink-100 text-pink-700" },
};

/**
 * Nursing duration for display — always rounded to the nearest minute (exact
 * seconds are still stored in the DB). Sub-30s rounds to "<1m" rather than
 * "0m" so a very short session still reads sensibly.
 */
export function sideDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m < 1 ? "<1m" : `${m}m`;
}

// ——— In-progress nursing sessions (server-backed, timestamp-based) ———
//
// An in-progress feed_breast stores accumulated per-side seconds plus which
// side is currently running and when it started, so elapsed is computed from
// wall-clock timestamps (survives backgrounding / app close) rather than a
// browser tick counter.
//   data = { left_seconds, right_seconds, active_side, active_since }

/** Live per-side seconds for an in-progress nursing session, given now (ms). */
export function liveNursing(data: any, nowMs: number): { left: number; right: number; active: Side | null } {
  const active = (data?.active_side ?? null) as Side | null;
  const since = data?.active_since ? +new Date(data.active_since) : null;
  let left = data?.left_seconds ?? 0;
  let right = data?.right_seconds ?? 0;
  if (active && since) {
    const seg = Math.max(0, (nowMs - since) / 1000);
    if (active === "left") left += seg;
    else right += seg;
  }
  return { left, right, active };
}

/** Fold the running segment into the accumulated totals and pause. */
export function settleNursing(data: any, nowMs: number) {
  const { left, right } = liveNursing(data, nowMs);
  return { left_seconds: Math.round(left), right_seconds: Math.round(right), active_side: null, active_since: null };
}

/** Which sides were nursed, in order, with their durations. */
export function nursingSides(data: any): { side: Side; seconds: number }[] {
  const out: { side: Side; seconds: number }[] = [];
  if (data?.left_seconds) out.push({ side: "left", seconds: data.left_seconds });
  if (data?.right_seconds) out.push({ side: "right", seconds: data.right_seconds });
  // if nothing timed but a side is recorded, still show it
  if (out.length === 0 && data?.last_side) out.push({ side: data.last_side, seconds: 0 });
  return out;
}

/** Human summary of an event's data for the timeline. */
export function summarizeEvent(type: EventType, data: any, _startTime?: string, _endTime?: string | null): string {
  switch (type) {
    case "feed_breast": {
      const sides = nursingSides(data);
      if (!sides.length) return "Nursing";
      return sides.map((s) => `${SIDE[s.side].label}${s.seconds ? ` ${sideDuration(s.seconds)}` : ""}`).join(" · ");
    }
    case "feed_bottle":
      return data?.volume_ml ? `${data.volume_ml} ml ${data.contents ?? ""}`.trim() : "bottle";
    case "feed_solid":
      return (data?.foods?.length ? data.foods.join(", ") : "solids");
    case "pump": {
      const total = (data?.left_ml ?? 0) + (data?.right_ml ?? 0);
      return total ? `${total} ml pumped` : "pump";
    }
    case "diaper":
      return data?.kind ?? "diaper";
    case "growth": {
      const bits = [];
      if (data?.weight_g) bits.push(`${(data.weight_g / 1000).toFixed(2)} kg`);
      if (data?.height_cm) bits.push(`${data.height_cm} cm`);
      if (data?.head_cm) bits.push(`head ${data.head_cm} cm`);
      return bits.join(" · ") || "growth";
    }
    case "medicine":
      return [data?.name, data?.dose && `${data.dose}${data.unit ?? ""}`].filter(Boolean).join(" ") || "medicine";
    case "temperature":
      return data?.celsius ? `${data.celsius}°C` : "temperature";
    default:
      return EVENT_DEFS[type]?.label ?? type;
  }
}
