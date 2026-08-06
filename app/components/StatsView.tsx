"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  StatEvent,
  DayStats,
  DetailStats,
  todayStats,
  detailStats,
  eventsForDay,
  eventsForKeys,
  keysEndingToday,
  keysBetween,
  seriesForKeys,
  averagesForSeries,
  localDayKey,
} from "@/lib/stats";
import { hoursMinutes, minutesLabel, timeAgo } from "@/lib/format";
import { SIDE } from "@/lib/events";
import { Card, TextInput } from "@/app/components/ui";

const PRESETS = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];
type Selection = { kind: "preset"; key: PresetKey } | { kind: "custom" };

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function StatsView({
  childId,
  childName,
  events,
}: {
  childId: string;
  childName: string;
  events: StatEvent[];
}) {
  // stamp "now" once per render; fine for a stats screen
  const now = useMemo(() => new Date(), []);
  const todayKey = localDayKey(now);
  const minDate = useMemo(() => {
    const d = new Date(now);
    d.setDate(now.getDate() - 185);
    return ymd(d);
  }, [now]);

  const [sel, setSel] = useState<Selection>({ kind: "preset", key: "7d" });
  const [from, setFrom] = useState(() => {
    const d = new Date(now);
    d.setDate(now.getDate() - 6);
    return ymd(d);
  });
  const [to, setTo] = useState(() => ymd(now));

  // day keys under analysis (oldest first)
  const keys = useMemo(() => {
    if (sel.kind === "preset") {
      const days = PRESETS.find((p) => p.key === sel.key)!.days;
      return keysEndingToday(now, days);
    }
    // custom: guard against reversed dates
    return from <= to ? keysBetween(from, to) : keysBetween(to, from);
  }, [sel, from, to, now]);

  const includesToday = keys.includes(todayKey);
  const completeKeys = useMemo(() => keys.filter((k) => k !== todayKey), [keys, todayKey]);

  const today = useMemo(() => todayStats(events, now), [events, now]);
  const series = useMemo(() => seriesForKeys(events, keys, todayKey), [events, keys, todayKey]);
  const stats = useMemo(() => averagesForSeries(series), [series]);
  const todayDetail = useMemo(() => detailStats(eventsForDay(events, todayKey)), [events, todayKey]);
  const rangeDetail = useMemo(() => detailStats(eventsForKeys(events, completeKeys)), [events, completeKeys]);

  // a "single day" view (one preset=today, or a one-day custom range)
  const singleDay = keys.length === 1;

  return (
    <div className="min-h-dvh px-5 py-6">
      <header className="mb-5 flex items-center justify-between">
        <Link href={`/child/${childId}`} className="tap text-ink-faint active:text-ink-soft">
          ‹ Timeline
        </Link>
        <h1 className="font-bold">{childName} · Stats</h1>
        <span className="w-14" />
      </header>

      {/* range toggle */}
      <div className="mb-3 flex gap-2">
        {PRESETS.map((r) => (
          <button
            key={r.key}
            onClick={() => setSel({ kind: "preset", key: r.key })}
            className={`tap flex-1 rounded-xl border py-2 text-sm font-medium ${
              sel.kind === "preset" && sel.key === r.key ? "border-brand-500 bg-accent-soft text-accent-soft-fg" : "border-line text-ink-soft"
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => setSel({ kind: "custom" })}
          className={`tap flex-1 rounded-xl border py-2 text-sm font-medium ${
            sel.kind === "custom" ? "border-brand-500 bg-accent-soft text-accent-soft-fg" : "border-line text-ink-soft"
          }`}
        >
          Custom
        </button>
      </div>

      {sel.kind === "custom" && (
        <div className="mb-5 flex items-end gap-2">
          <label className="flex-1 text-xs text-ink-soft">
            From
            <TextInput
              type="date"
              value={from}
              min={minDate}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1"
            />
          </label>
          <label className="flex-1 text-xs text-ink-soft">
            To
            <TextInput
              type="date"
              value={to}
              min={from}
              max={ymd(now)}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1"
            />
          </label>
        </div>
      )}

      {/* Today so far — only when the range includes today */}
      {includesToday && (
        <>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Today so far</h2>
          <div className="grid grid-cols-3 gap-3">
            <Tile label="Feeds" value={String(today.feeds)} sub={today.lastFeedAgoSeconds != null ? `last ${ago(today.lastFeedAgoSeconds)}` : "—"} />
            <Tile label="Sleep" value={hoursMinutes(today.sleepSeconds)} sub={today.sleepInProgress ? "sleeping now" : " "} />
            <Tile label="Diapers" value={String(today.diapers)} sub=" " />
          </div>
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-ink-faint">Today&apos;s detail</h2>
          <Details stats={todayDetail} />
        </>
      )}

      {/* averages/bars/detail over the selected complete days (unless it's just today) */}
      {!(singleDay && includesToday) && (
        <>
          <div className="mt-8 mb-2 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {stats.completeDays === 1 ? "That day" : "Daily average"}
            </h2>
            <span className="text-xs text-ink-faint">
              {stats.completeDays} day{stats.completeDays === 1 ? "" : "s"}
            </span>
          </div>
          {stats.completeDays === 0 ? (
            <Card subtle className="text-center text-sm text-ink-faint">
              No complete days in this range yet.
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Tile label="Feeds / day" value={round1(stats.avgFeedsPerDay)} sub=" " />
                <Tile label="Sleep / day" value={hoursMinutes(stats.avgSleepSecondsPerDay)} sub=" " />
                <Tile label="Diapers / day" value={round1(stats.avgDiapersPerDay)} sub=" " />
              </div>

              {/* per-day bars */}
              <div className="mt-6 space-y-4">
                <BarRow title="Feeds per day" series={series} pick={(d) => d.feeds} fmt={(v) => String(v)} color="bg-amber-400" />
                <BarRow
                  title="Sleep per day"
                  series={series}
                  pick={(d) => d.sleepSeconds / 3600}
                  fmt={(v) => hoursMinutes(v * 3600)}
                  color="bg-indigo-400"
                />
                <BarRow title="Diapers per day" series={series} pick={(d) => d.diapers} fmt={(v) => String(v)} color="bg-lime-500" />
              </div>

              {/* range detail (over complete days) */}
              <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Detail · {stats.completeDays} day{stats.completeDays === 1 ? "" : "s"}
              </h2>
              <Details stats={rangeDetail} />
            </>
          )}
        </>
      )}
    </div>
  );
}

// Shared detail block — used for both a single day and a range.
function Details({ stats }: { stats: DetailStats }) {
  return (
    <div className="space-y-2">
      <DetailRow label="Nursing sessions" value={stats.nursingSessions ? String(stats.nursingSessions) : "—"} />
      <DetailRow label="Avg nursing session" value={stats.avgNursingSeconds ? minutesLabel(stats.avgNursingSeconds) : "—"} />
      <DetailRow
        label="Avg per side"
        value={
          stats.avgLeftSeconds || stats.avgRightSeconds
            ? `${SIDE.left.short} ${minutesLabel(stats.avgLeftSeconds)} · ${SIDE.right.short} ${minutesLabel(stats.avgRightSeconds)}`
            : "—"
        }
      />
      <DetailRow
        label="Total per side"
        value={
          stats.totalLeftSeconds || stats.totalRightSeconds
            ? `${SIDE.left.short} ${hoursMinutes(stats.totalLeftSeconds)} · ${SIDE.right.short} ${hoursMinutes(stats.totalRightSeconds)}`
            : "—"
        }
      />
      <DetailRow label="Longest sleep stretch" value={stats.longestSleepSeconds ? hoursMinutes(stats.longestSleepSeconds) : "—"} />
      <DetailRow
        label="Avg time between feeds"
        value={stats.avgGapBetweenFeedsSeconds != null ? hoursMinutes(stats.avgGapBetweenFeedsSeconds) : "—"}
      />
      <DetailRow
        label="Diapers (poop / pee / both)"
        value={stats.diaper.total ? `${stats.diaper.poop} / ${stats.diaper.pee} / ${stats.diaper.both}` : "—"}
      />
    </div>
  );
}

function ago(seconds: number): string {
  const iso = new Date(Date.now() - seconds * 1000).toISOString();
  return timeAgo(iso);
}
const round1 = (n: number) => (Math.round(n * 10) / 10).toString();

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 text-center">
      <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-0.5 truncate text-[11px] text-ink-faint">{sub}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-2.5">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function BarRow({
  title,
  series,
  pick,
  fmt,
  color,
}: {
  title: string;
  series: DayStats[];
  pick: (d: DayStats) => number;
  fmt: (v: number) => string;
  color: string;
}) {
  const max = Math.max(1, ...series.map(pick));
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-ink-soft">{title}</p>
      <div className="flex items-end gap-1" style={{ height: 72 }}>
        {series.map((d) => {
          const v = pick(d);
          const h = Math.round((v / max) * 100);
          const dow = new Date(d.key + "T00:00:00").toLocaleDateString([], { weekday: "narrow" });
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center justify-end" title={`${d.key}: ${fmt(v)}${d.isPartial ? " (so far)" : ""}`}>
              <div
                className={`w-full rounded-t ${color} ${d.isPartial ? "opacity-40" : ""}`}
                style={{ height: `${Math.max(v > 0 ? 6 : 0, h)}%` }}
              />
              <span className="mt-1 text-[9px] text-ink-faint">{dow}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
