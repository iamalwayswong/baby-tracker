"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  StatEvent,
  DayStats,
  DetailStats,
  dailySeries,
  rangeStats,
  todayStats,
  detailStats,
  eventsForDay,
  eventsForCompleteDays,
  localDayKey,
} from "@/lib/stats";
import { hoursMinutes, minutesLabel, timeAgo } from "@/lib/format";
import { SIDE } from "@/lib/events";
import { Card } from "@/app/components/ui";

const RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
] as const;

export default function StatsView({
  childId,
  childName,
  events,
}: {
  childId: string;
  childName: string;
  events: StatEvent[];
}) {
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]["key"]>("7d");
  const range = RANGES.find((r) => r.key === rangeKey)!;
  // stamp "now" once per render; fine for a stats screen
  const now = useMemo(() => new Date(), []);

  const today = useMemo(() => todayStats(events, now), [events, now]);
  const series = useMemo(() => dailySeries(events, now, range.days), [events, now, range.days]);
  const stats = useMemo(() => rangeStats(events, now, range.days), [events, now, range.days]);

  // detail for Today (partial day) and for the range's complete days
  const todayDetail = useMemo(() => detailStats(eventsForDay(events, localDayKey(now))), [events, now]);
  const rangeDetail = useMemo(
    () => detailStats(eventsForCompleteDays(events, now, range.days)),
    [events, now, range.days]
  );

  const isToday = rangeKey === "today";

  return (
    <div className="min-h-dvh px-5 py-6">
      <header className="mb-5 flex items-center justify-between">
        <Link href={`/child/${childId}`} className="tap text-gray-400 active:text-gray-600">
          ‹ Timeline
        </Link>
        <h1 className="font-bold">{childName} · Stats</h1>
        <span className="w-14" />
      </header>

      {/* range toggle */}
      <div className="mb-5 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={`tap flex-1 rounded-xl border py-2 text-sm font-medium ${
              rangeKey === r.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-300 text-gray-600"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Today so far — always shown, never averaged in */}
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Today so far</h2>
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Feeds" value={String(today.feeds)} sub={today.lastFeedAgoSeconds != null ? `last ${ago(today.lastFeedAgoSeconds)}` : "—"} />
        <Tile label="Sleep" value={hoursMinutes(today.sleepSeconds)} sub={today.sleepInProgress ? "sleeping now" : " "} />
        <Tile label="Diapers" value={String(today.diapers)} sub=" " />
      </div>

      {/* full detail for today */}
      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400">Today&apos;s detail</h2>
      <Details stats={todayDetail} />

      {!isToday && (
        <>
          {/* Averages over complete days */}
          <div className="mt-8 mb-2 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Daily average</h2>
            <span className="text-xs text-gray-400">
              over {stats.completeDays} complete day{stats.completeDays === 1 ? "" : "s"}
            </span>
          </div>
          {stats.completeDays === 0 ? (
            <Card subtle className="text-center text-sm text-gray-400">
              Not enough history yet — averages need at least one complete day.
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
              <h2 className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Detail · last {stats.completeDays} day{stats.completeDays === 1 ? "" : "s"}
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
    <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center">
      <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 truncate text-[11px] text-gray-400">{sub}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-2.5">
      <span className="text-sm text-gray-600">{label}</span>
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
      <p className="mb-1 text-xs font-medium text-gray-500">{title}</p>
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
              <span className="mt-1 text-[9px] text-gray-400">{dow}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
