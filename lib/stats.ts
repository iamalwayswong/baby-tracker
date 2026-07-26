// Pure aggregation for the stats view. Runs client-side so day boundaries use
// the viewer's local timezone (consistent with the timeline's day grouping).
//
// Key rule: averages are computed over COMPLETE days only — the current
// (partial) day is reported separately as "today so far" and never averaged in,
// so a half-finished day can't drag the numbers down.
import { EventType } from "./events";

export type StatEvent = {
  type: EventType;
  start_time: string;
  end_time: string | null;
  data: any;
};

const MILK_FEEDS: EventType[] = ["feed_breast", "feed_bottle"];

/** YYYY-MM-DD in local time — the day-bucket key. */
export function localDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function durationSeconds(e: StatEvent): number {
  if (!e.end_time) return 0;
  return Math.max(0, (+new Date(e.end_time) - +new Date(e.start_time)) / 1000);
}

export type DayStats = {
  key: string; // YYYY-MM-DD (local)
  feeds: number; // milk feeds (breast + bottle)
  nursingSessions: number;
  sleepSeconds: number;
  longestSleepSeconds: number;
  diapers: number;
  isPartial: boolean; // true only for today
};

export type RangeStats = {
  completeDays: number;
  // averages over complete days
  avgFeedsPerDay: number;
  avgSleepSecondsPerDay: number;
  avgDiapersPerDay: number;
};

// Rich detail that works over any event set — a single day or a whole range.
export type DetailStats = {
  nursingSessions: number;
  avgNursingSeconds: number; // per session
  avgLeftSeconds: number; // per session that used the left side
  avgRightSeconds: number;
  totalLeftSeconds: number; // summed across the set
  totalRightSeconds: number;
  longestSleepSeconds: number;
  avgGapBetweenFeedsSeconds: number | null;
  diaper: { pee: number; poop: number; both: number; total: number };
};

export type TodayStats = {
  feeds: number;
  sleepSeconds: number;
  diapers: number;
  lastFeedAgoSeconds: number | null;
  lastSleepEndAgoSeconds: number | null;
  sleepInProgress: boolean;
};

/** Group events into per-day buckets by local start day. */
export function bucketByDay(events: StatEvent[]): Map<string, StatEvent[]> {
  const map = new Map<string, StatEvent[]>();
  for (const e of events) {
    const key = localDayKey(new Date(e.start_time));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return map;
}

function dayStatsFor(key: string, events: StatEvent[], todayKey: string): DayStats {
  let feeds = 0;
  let nursingSessions = 0;
  let sleepSeconds = 0;
  let longestSleepSeconds = 0;
  let diapers = 0;
  for (const e of events) {
    if (MILK_FEEDS.includes(e.type)) feeds++;
    if (e.type === "feed_breast") nursingSessions++;
    if (e.type === "sleep") {
      const s = durationSeconds(e);
      sleepSeconds += s;
      longestSleepSeconds = Math.max(longestSleepSeconds, s);
    }
    if (e.type === "diaper") diapers++;
  }
  return { key, feeds, nursingSessions, sleepSeconds, longestSleepSeconds, diapers, isPartial: key === todayKey };
}

/** Per-day series for the last `days` days ending today (oldest first). */
export function dailySeries(events: StatEvent[], now: Date, days: number): DayStats[] {
  const todayKey = localDayKey(now);
  const buckets = bucketByDay(events);
  const out: DayStats[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = localDayKey(d);
    out.push(dayStatsFor(key, buckets.get(key) ?? [], todayKey));
  }
  return out;
}

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

/** Per-day averages over COMPLETE days only (today excluded). */
export function rangeStats(events: StatEvent[], now: Date, days: number): RangeStats {
  const complete = dailySeries(events, now, days).filter((d) => !d.isPartial);
  return {
    completeDays: complete.length,
    avgFeedsPerDay: avg(complete.map((d) => d.feeds)),
    avgSleepSecondsPerDay: avg(complete.map((d) => d.sleepSeconds)),
    avgDiapersPerDay: avg(complete.map((d) => d.diapers)),
  };
}

/** Events on a specific local day. */
export function eventsForDay(events: StatEvent[], dayKey: string): StatEvent[] {
  return events.filter((e) => localDayKey(new Date(e.start_time)) === dayKey);
}

// ——— arbitrary day-range support (for the stats date picker) ———

/** Local day keys for the last `days` days ending today (oldest first). */
export function keysEndingToday(now: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(localDayKey(d));
  }
  return out;
}

/** Inclusive local day keys between two YYYY-MM-DD keys (oldest first, capped). */
export function keysBetween(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  const d = new Date(fromKey + "T00:00:00");
  const end = new Date(toKey + "T00:00:00");
  let guard = 0;
  while (d.getTime() <= end.getTime() && guard++ < 400) {
    out.push(localDayKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Per-day stats for an explicit list of day keys. */
export function seriesForKeys(events: StatEvent[], keys: string[], todayKey: string): DayStats[] {
  const buckets = bucketByDay(events);
  return keys.map((k) => dayStatsFor(k, buckets.get(k) ?? [], todayKey));
}

/** Averages over the complete (non-today) days of a series. */
export function averagesForSeries(series: DayStats[]): RangeStats {
  const complete = series.filter((d) => !d.isPartial);
  return {
    completeDays: complete.length,
    avgFeedsPerDay: avg(complete.map((d) => d.feeds)),
    avgSleepSecondsPerDay: avg(complete.map((d) => d.sleepSeconds)),
    avgDiapersPerDay: avg(complete.map((d) => d.diapers)),
  };
}

/** Events falling on any of the given local day keys. */
export function eventsForKeys(events: StatEvent[], keys: string[]): StatEvent[] {
  const set = new Set(keys);
  return events.filter((e) => set.has(localDayKey(new Date(e.start_time))));
}

/** Events falling on the complete (non-today) days of the range. */
export function eventsForCompleteDays(events: StatEvent[], now: Date, days: number): StatEvent[] {
  const completeKeys = new Set(dailySeries(events, now, days).filter((d) => !d.isPartial).map((d) => d.key));
  return events.filter((e) => completeKeys.has(localDayKey(new Date(e.start_time))));
}

/** Rich nursing/sleep/diaper detail over any event set (a day or a range). */
export function detailStats(events: StatEvent[]): DetailStats {
  const nursing = events.filter((e) => e.type === "feed_breast");
  // nursing "duration" is active time (L+R), not the start→end span
  const nursingDurs = nursing.map((e) => (e.data?.left_seconds ?? 0) + (e.data?.right_seconds ?? 0)).filter((s) => s > 0);
  const lefts = nursing.map((e) => e.data?.left_seconds ?? 0);
  const rights = nursing.map((e) => e.data?.right_seconds ?? 0);

  // gaps between consecutive milk feeds, within each local day (no overnight gaps)
  const byDay = new Map<string, number[]>();
  for (const e of events) {
    if (!MILK_FEEDS.includes(e.type)) continue;
    const k = localDayKey(new Date(e.start_time));
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(+new Date(e.start_time));
  }
  const gaps: number[] = [];
  for (const times of byDay.values()) {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / 1000);
  }

  const longestSleepSeconds = Math.max(0, ...events.filter((e) => e.type === "sleep").map(durationSeconds));

  const diaper = { pee: 0, poop: 0, both: 0, total: 0 };
  for (const e of events.filter((e) => e.type === "diaper")) {
    const k = e.data?.kind as "pee" | "poop" | "both" | undefined;
    if (k && k in diaper) (diaper as any)[k]++;
    diaper.total++;
  }

  const sum = (n: number[]) => n.reduce((a, b) => a + b, 0);
  const posAvg = (n: number[]) => {
    const p = n.filter((x) => x > 0);
    return p.length ? avg(p) : 0;
  };

  return {
    nursingSessions: nursing.length,
    avgNursingSeconds: nursingDurs.length ? avg(nursingDurs) : 0,
    avgLeftSeconds: posAvg(lefts),
    avgRightSeconds: posAvg(rights),
    totalLeftSeconds: sum(lefts),
    totalRightSeconds: sum(rights),
    longestSleepSeconds,
    avgGapBetweenFeedsSeconds: gaps.length ? avg(gaps) : null,
    diaper,
  };
}

/** Today-so-far totals (never averaged into range stats). */
export function todayStats(events: StatEvent[], now: Date): TodayStats {
  const todayKey = localDayKey(now);
  const today = events.filter((e) => localDayKey(new Date(e.start_time)) === todayKey);
  const nowMs = +now;

  let feeds = 0;
  let sleepSeconds = 0;
  let diapers = 0;
  let lastFeedMs: number | null = null;
  let lastSleepEndMs: number | null = null;
  let sleepInProgress = false;

  for (const e of today) {
    if (MILK_FEEDS.includes(e.type)) {
      feeds++;
      lastFeedMs = Math.max(lastFeedMs ?? 0, +new Date(e.start_time));
    }
    if (e.type === "sleep") {
      // count elapsed for in-progress sleep up to now
      const end = e.end_time ? +new Date(e.end_time) : nowMs;
      sleepSeconds += Math.max(0, (end - +new Date(e.start_time)) / 1000);
      if (!e.end_time) sleepInProgress = true;
      else lastSleepEndMs = Math.max(lastSleepEndMs ?? 0, end);
    }
    if (e.type === "diaper") diapers++;
  }

  return {
    feeds,
    sleepSeconds,
    diapers,
    lastFeedAgoSeconds: lastFeedMs ? (nowMs - lastFeedMs) / 1000 : null,
    lastSleepEndAgoSeconds: lastSleepEndMs ? (nowMs - lastSleepEndMs) / 1000 : null,
    sleepInProgress,
  };
}
