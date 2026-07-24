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

/** Human summary of an event's data for the timeline. */
export function summarizeEvent(type: EventType, data: any, _startTime?: string, _endTime?: string | null): string {
  switch (type) {
    case "feed_breast": {
      const l = Math.round((data?.left_seconds ?? 0) / 60);
      const r = Math.round((data?.right_seconds ?? 0) / 60);
      const parts = [];
      if (l) parts.push(`L ${l}m`);
      if (r) parts.push(`R ${r}m`);
      return parts.length ? parts.join(" · ") : "nursing";
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
