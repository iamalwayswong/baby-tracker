// "SweetSpot-lite" nap predictor. Blends age-based wake windows (a bundled
// reference table) with the baby's OWN recent wake windows, anchored to when
// they last woke, to estimate when the next nap window opens.
//
// Pure + client-safe so it can recompute live against the ticking clock.
import { EventType } from "./events";

export type PredictEvent = { type: EventType; start_time: string; end_time: string | null };

// Typical wake window (minutes) by age — midpoints of common published ranges.
const WAKE_WINDOWS: { maxMonths: number; minutes: number }[] = [
  { maxMonths: 1, minutes: 45 },
  { maxMonths: 2, minutes: 60 },
  { maxMonths: 3, minutes: 75 },
  { maxMonths: 4, minutes: 90 },
  { maxMonths: 6, minutes: 105 },
  { maxMonths: 9, minutes: 150 },
  { maxMonths: 12, minutes: 180 },
  { maxMonths: 18, minutes: 240 },
  { maxMonths: 36, minutes: 300 },
  { maxMonths: Infinity, minutes: 360 },
];

export function ageMonths(birthDate: string | null, now: Date): number | null {
  if (!birthDate) return null;
  const days = (+now - +new Date(birthDate)) / (24 * 60 * 60 * 1000);
  return days < 0 ? null : days / 30.4375;
}

export function ageBasedWakeWindowMin(months: number): number {
  return (WAKE_WINDOWS.find((w) => months < w.maxMonths) ?? WAKE_WINDOWS[WAKE_WINDOWS.length - 1]).minutes;
}

// Personal wake windows: gaps between one sleep ending and the next starting.
// Filter outliers (very short/overnight-long) so a forgotten timer can't skew it.
const MIN_WW_MIN = 15;
const MAX_WW_MIN = 8 * 60;

function personalWakeWindows(sleeps: PredictEvent[]): number[] {
  const done = sleeps.filter((s) => s.end_time).sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
  const out: number[] = [];
  for (let i = 1; i < done.length; i++) {
    const gapMin = (+new Date(done[i].start_time) - +new Date(done[i - 1].end_time!)) / 60000;
    if (gapMin >= MIN_WW_MIN && gapMin <= MAX_WW_MIN) out.push(gapMin);
  }
  return out.slice(-5); // last 5 windows
}

const avg = (n: number[]) => n.reduce((a, b) => a + b, 0) / n.length;

export type NapPrediction =
  | { state: "sleeping" }
  | { state: "insufficient"; needsBirthday: boolean }
  // The anchor (last logged wake) is too old for the prediction to mean
  // anything — e.g. no sleep has been logged in a while. Hide the banner.
  | { state: "stale" }
  | {
      state: "predict";
      nextWindowMs: number; // predicted start of the next nap window
      wakeWindowMin: number; // blended wake window used
      personalized: boolean;
      lastWokeMs: number;
    };

export function predictNap(events: PredictEvent[], birthDate: string | null, now: Date): NapPrediction {
  const sleeps = events.filter((e) => e.type === "sleep");

  // currently asleep? the in-progress banner covers that case.
  if (sleeps.some((s) => !s.end_time)) return { state: "sleeping" };

  const completed = sleeps.filter((s) => s.end_time);
  const months = ageMonths(birthDate, now);
  const personal = personalWakeWindows(sleeps);
  const hasAge = months != null;
  const hasPersonal = personal.length >= 2;

  // need at least one anchor (a past wake) and at least one WW source
  if (!completed.length || (!hasAge && !hasPersonal)) {
    return { state: "insufficient", needsBirthday: !hasAge && !hasPersonal };
  }

  const ageWW = hasAge ? ageBasedWakeWindowMin(months!) : null;
  const personalWW = hasPersonal ? avg(personal) : null;
  const wakeWindowMin =
    ageWW != null && personalWW != null ? (ageWW + personalWW) / 2 : (personalWW ?? ageWW)!;

  const lastWokeMs = Math.max(...completed.map((s) => +new Date(s.end_time!)));
  const nextWindowMs = lastWokeMs + wakeWindowMin * 60000;

  // A prediction is only meaningful near its window. Once we're overdue by more
  // than a full wake window (i.e. the last wake is 2+ windows old), the anchor
  // is stale — likely no recent sleep was logged — so drop it rather than show
  // an ever-growing "window open · 111h ago".
  if (+now - nextWindowMs > wakeWindowMin * 60000) {
    return { state: "stale" };
  }

  return {
    state: "predict",
    nextWindowMs,
    wakeWindowMin: Math.round(wakeWindowMin),
    personalized: personalWW != null,
    lastWokeMs,
  };
}
