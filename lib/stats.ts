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
  // nursing
  avgNursingSeconds: number; // per session
  avgLeftSeconds: number;
  avgRightSeconds: number;
  nursingSessions: number;
  // sleep
  longestSleepSeconds: number; // single longest stretch in range
  // feed cadence
  avgGapBetweenFeedsSeconds: number | null;
  // diaper breakdown
  diaper: { wet: number; dirty: number; mixed: number; total: number };
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

/** Range averages over COMPLETE days only (today excluded). */
export function rangeStats(events: StatEvent[], now: Date, days: number): RangeStats {
  const series = dailySeries(events, now, days);
  const complete = series.filter((d) => !d.isPartial);

  // Complete-day events only, for cadence + nursing + diapers within the range.
  const completeKeys = new Set(complete.map((d) => d.key));
  const inRange = events.filter((e) => completeKeys.has(localDayKey(new Date(e.start_time))));

  const nursing = inRange.filter((e) => e.type === "feed_breast");
  const nursingDurs = nursing.map(durationSeconds).filter((s) => s > 0);
  const lefts = nursing.map((e) => e.data?.left_seconds ?? 0).filter((s: number) => s > 0);
  const rights = nursing.map((e) => e.data?.right_seconds ?? 0).filter((s: number) => s > 0);

  // avg gap between consecutive milk feeds, within each complete day
  const gaps: number[] = [];
  for (const key of completeKeys) {
    const feeds = inRange
      .filter((e) => MILK_FEEDS.includes(e.type) && localDayKey(new Date(e.start_time)) === key)
      .map((e) => +new Date(e.start_time))
      .sort((a, b) => a - b);
    for (let i = 1; i < feeds.length; i++) gaps.push((feeds[i] - feeds[i - 1]) / 1000);
  }

  const diaper = { wet: 0, dirty: 0, mixed: 0, total: 0 };
  for (const e of inRange.filter((e) => e.type === "diaper")) {
    const k = e.data?.kind as "wet" | "dirty" | "mixed" | undefined;
    if (k && k in diaper) (diaper as any)[k]++;
    diaper.total++;
  }

  return {
    completeDays: complete.length,
    avgFeedsPerDay: avg(complete.map((d) => d.feeds)),
    avgSleepSecondsPerDay: avg(complete.map((d) => d.sleepSeconds)),
    avgDiapersPerDay: avg(complete.map((d) => d.diapers)),
    avgNursingSeconds: avg(nursingDurs),
    avgLeftSeconds: avg(lefts),
    avgRightSeconds: avg(rights),
    nursingSessions: nursing.length,
    longestSleepSeconds: Math.max(0, ...complete.map((d) => d.longestSleepSeconds)),
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
