"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import {
  EVENT_DEFS,
  EventType,
  QUICK_EVENT_TYPES,
  ALL_EVENT_TYPES,
  summarizeEvent,
  Side,
  SIDE,
  nursingSides,
  sideDuration,
  settleNursing,
  liveNursing,
} from "@/lib/events";
import { clockTime, dayLabel, humanDuration, stopwatch, timeAgo } from "@/lib/format";
import { predictNap } from "@/lib/predict";
import { useChildSocket } from "./useChildSocket";
import NursingSheet from "./NursingSheet";
import LogSheet from "./LogSheet";
import EditEventSheet from "./EditEventSheet";
import ChildSwitcher from "./ChildSwitcher";

type EventRow = {
  id: string;
  type: EventType;
  start_time: string;
  end_time: string | null;
  data: any;
  note: string | null;
  created_by: string;
  created_by_name?: string;
};

type Sheet = { kind: "nursing" } | { kind: "log"; type: EventType } | { kind: "edit"; event: EventRow } | null;

export default function ChildTimeline({
  child,
  initialEvents,
  siblings = [],
  openNursing = false,
}: {
  child: { id: string; name: string; birth_date: string | null; sex: string };
  initialEvents: EventRow[];
  siblings?: { id: string; name: string }[];
  openNursing?: boolean;
}) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [sheet, setSheet] = useState<Sheet>(openNursing ? { kind: "nursing" } : null);
  const [now, setNow] = useState(() => Date.now());

  // tick every second so live timers update
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const upsert = useCallback((e: EventRow) => {
    setEvents((list) => {
      const without = list.filter((x) => x.id !== e.id);
      return [e, ...without].sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));
    });
  }, []);

  const status = useChildSocket(
    child.id,
    useCallback(
      (msg: any) => {
        if (msg.kind === "event.created" || msg.kind === "event.updated") upsert(msg.event);
        else if (msg.kind === "event.deleted") setEvents((l) => l.filter((x) => x.id !== msg.id));
      },
      [upsert]
    )
  );

  async function logEvent(type: EventType, body: Partial<EventRow> & { data?: any; note?: string }) {
    const { event } = await api<{ event: EventRow }>(`/api/children/${child.id}/events`, {
      json: { type, ...body },
    });
    upsert(event);
    return event;
  }

  async function stopTimer(id: string) {
    const { event } = await api<{ event: EventRow }>(`/api/events/${id}`, {
      method: "PATCH",
      json: { end_time: new Date().toISOString() },
    });
    upsert(event);
  }

  async function patchEvent(id: string, body: any) {
    const { event } = await api<{ event: EventRow }>(`/api/events/${id}`, { method: "PATCH", json: body });
    upsert(event);
    return event;
  }

  // in-progress duration events (running timers, shared across parents)
  const inProgress = events.filter((e) => !e.end_time && EVENT_DEFS[e.type]?.kind === "duration");
  const nursingSession = inProgress.find((e) => e.type === "feed_breast") ?? null;

  // ——— nursing session control (server-backed, timestamp-based) ———
  async function nurseTapSide(side: Side) {
    const s = nursingSession;
    const nowIso = new Date().toISOString();
    if (!s) {
      // start a fresh in-progress session on the tapped side
      await logEvent("feed_breast", { data: { left_seconds: 0, right_seconds: 0, active_side: side, active_since: nowIso } });
      return;
    }
    const settled = settleNursing(s.data, Date.now());
    if (s.data?.active_side === side) {
      await patchEvent(s.id, { data: settled }); // tapping the running side pauses
    } else {
      await patchEvent(s.id, { data: { ...settled, active_side: side, active_since: nowIso } }); // switch
    }
  }

  async function nurseSave() {
    const s = nursingSession;
    if (!s) return setSheet(null);
    const settled = settleNursing(s.data, Date.now());
    const last_side = (s.data?.active_side as Side) ?? (s.data?.last_side as Side) ?? (settled.left_seconds >= settled.right_seconds ? "left" : "right");
    await patchEvent(s.id, {
      end_time: new Date().toISOString(),
      data: { left_seconds: settled.left_seconds, right_seconds: settled.right_seconds, last_side },
    });
    setSheet(null);
  }

  async function nurseDiscard() {
    if (nursingSession) {
      await api(`/api/events/${nursingSession.id}`, { method: "DELETE" });
      setEvents((l) => l.filter((x) => x.id !== nursingSession.id));
    }
    setSheet(null);
  }

  // the last side nursed (if any), and the suggested next side (the opposite)
  const lastSide: Side | null = useMemo(() => {
    const last = events.find((e) => e.type === "feed_breast" && e.data?.last_side);
    return (last?.data?.last_side as Side) ?? null;
  }, [events]);
  const suggestedSide: Side = lastSide === "left" ? "right" : "left";

  const sleepInProgress = inProgress.find((e) => e.type === "sleep");

  // next-nap prediction (recomputes as `now` ticks)
  const nap = useMemo(
    () => predictNap(events, child.birth_date, new Date(now)),
    [events, child.birth_date, now]
  );

  async function quickTap(type: EventType) {
    if (type === "feed_breast") return setSheet({ kind: "nursing" });
    if (type === "sleep") {
      if (sleepInProgress) return stopTimer(sleepInProgress.id);
      return void logEvent("sleep", {}); // starts a running timer
    }
    setSheet({ kind: "log", type });
  }

  const grouped = groupByDay(events);

  return (
    <div className="min-h-dvh pb-28">
      {/* header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white/90 px-5 py-4 backdrop-blur">
        <span className="w-10" />
        <div className="flex flex-col items-center">
          <ChildSwitcher current={{ id: child.id, name: child.name }} siblings={siblings} />
          <span className={`text-xs ${status === "open" ? "text-emerald-500" : "text-gray-400"}`}>
            {status === "open" ? "● live" : "connecting…"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/child/${child.id}/stats`} className="tap text-gray-400 active:text-gray-600" title="Stats">
            📊
          </Link>
          <Link href={`/child/${child.id}/manage`} className="tap text-gray-400 active:text-gray-600" title="All entries">
            ▦
          </Link>
          <Link href={`/child/${child.id}/settings`} className="tap text-gray-400 active:text-gray-600" title="This child's settings">
            ⚙
          </Link>
        </div>
      </header>

      {/* in-progress banners */}
      {inProgress.length > 0 && (
        <div className="space-y-2 px-5 pt-2">
          {inProgress.map((e) =>
            e.type === "feed_breast" ? (
              // nursing: tap to resume the L/R sheet; shows live per-side time
              <button
                key={e.id}
                onClick={() => setSheet({ kind: "nursing" })}
                className="tap flex w-full items-center justify-between rounded-2xl bg-rose-500 px-4 py-3 text-left text-white active:bg-rose-600"
              >
                <div>
                  <p className="text-sm font-medium">🤱 Nursing in progress</p>
                  <p className="text-xs opacity-80">
                    {(() => {
                      const { left, right, active } = liveNursing(e.data, now);
                      const parts = [];
                      if (left) parts.push(`L ${sideDuration(left)}`);
                      if (right) parts.push(`R ${sideDuration(right)}`);
                      return `${parts.join(" · ") || "starting…"}${active ? "" : " · paused"}`;
                    })()}
                  </p>
                </div>
                <span className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-rose-600">Resume</span>
              </button>
            ) : (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-2xl bg-brand-600 px-4 py-3 text-white"
              >
                <div>
                  <p className="text-sm font-medium">
                    {EVENT_DEFS[e.type].emoji} {EVENT_DEFS[e.type].label} in progress
                  </p>
                  <p className="text-xs opacity-80">
                    started {timeAgo(e.start_time)}
                    {e.created_by_name ? ` by ${e.created_by_name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold tabular-nums">
                    {stopwatch((now - +new Date(e.start_time)) / 1000)}
                  </span>
                  <button
                    onClick={() => stopTimer(e.id)}
                    className="tap rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-700"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* next-nap prediction */}
      {nap.state === "predict" && <NapBanner nextWindowMs={nap.nextWindowMs} wakeWindowMin={nap.wakeWindowMin} personalized={nap.personalized} childName={child.name} nowMs={now} />}

      {/* quick log bar */}
      <div className="grid grid-cols-4 gap-3 px-5 py-4">
        {QUICK_EVENT_TYPES.map((type) => {
          const def = EVENT_DEFS[type];
          const isActiveSleep = type === "sleep" && sleepInProgress;
          const label =
            isActiveSleep ? "Stop"
            : type === "feed_breast" && nursingSession ? "Nursing…"
            : type === "feed_breast" && lastSide ? `Nurse ${SIDE[suggestedSide].short}`
            : def.label;
          return (
            <button
              key={type}
              onClick={() => quickTap(type)}
              className={`tap relative flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl text-white active:scale-95 ${def.color}`}
            >
              <span className="text-2xl">{def.emoji}</span>
              <span className="text-xs font-medium">{label}</span>
              {type === "feed_breast" && lastSide && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-gray-700">
                  {SIDE[suggestedSide].short}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* more trackers */}
      <MoreTrackers
        onPick={(type) => (EVENT_DEFS[type].kind === "duration" ? logEvent(type, {}) : setSheet({ kind: "log", type }))}
      />

      {/* timeline */}
      <div className="px-5">
        {grouped.length === 0 && (
          <p className="mt-10 text-center text-sm text-gray-400">
            No entries yet. Tap a button above to log the first one.
          </p>
        )}
        {grouped.map(([day, items]) => (
          <div key={day} className="mb-6">
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">{day}</h3>
            <div className="space-y-2">
              {items.map((e) => (
                <TimelineItem key={e.id} e={e} onClick={() => setSheet({ kind: "edit", event: e })} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* sheets */}
      {sheet?.kind === "nursing" && (
        <NursingSheet
          session={nursingSession}
          suggestedSide={suggestedSide}
          lastSide={lastSide}
          onSide={nurseTapSide}
          onSave={nurseSave}
          onDiscard={nurseDiscard}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === "log" && (
        <LogSheet
          type={sheet.type}
          onClose={() => setSheet(null)}
          onSave={async (payload) => {
            await logEvent(sheet.type, payload);
            setSheet(null);
          }}
        />
      )}
      {sheet?.kind === "edit" && (
        <EditEventSheet
          event={sheet.event}
          isMostRecent={sheet.event.id === events[0]?.id}
          onClose={() => setSheet(null)}
          onSaved={(updated) => {
            upsert(updated);
            setSheet(null);
          }}
          onDeleted={(id) => {
            setEvents((l) => l.filter((x) => x.id !== id));
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

function NapBanner({
  nextWindowMs,
  wakeWindowMin,
  personalized,
  childName,
  nowMs,
}: {
  nextWindowMs: number;
  wakeWindowMin: number;
  personalized: boolean;
  childName: string;
  nowMs: number;
}) {
  const diffMin = Math.round((nextWindowMs - nowMs) / 60000);
  const overdue = diffMin < 0;
  const when = clockTime(new Date(nextWindowMs).toISOString());
  const rel = overdue
    ? `window open · ${humanDuration(-diffMin * 60)} ago`
    : diffMin === 0
    ? "window opening now"
    : `in ${humanDuration(diffMin * 60)}`;
  return (
    <div className="px-5 pt-2">
      <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${overdue ? "bg-amber-100" : "bg-indigo-50"}`}>
        <div>
          <p className="text-sm font-semibold text-gray-800">
            😴 Next nap ~{when}
          </p>
          <p className="text-xs text-gray-500">
            {rel} · ~{wakeWindowMin}m awake{personalized ? ` · tuned to ${childName}` : ""}
          </p>
        </div>
        <span className={`text-2xl ${overdue ? "" : "opacity-60"}`}>{overdue ? "🥱" : "🔮"}</span>
      </div>
    </div>
  );
}

function MoreTrackers({ onPick }: { onPick: (t: EventType) => void }) {
  const [open, setOpen] = useState(false);
  const extras = ALL_EVENT_TYPES.filter((t) => !EVENT_DEFS[t].quick);
  return (
    <div className="px-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="tap w-full text-left text-sm font-medium text-brand-600"
      >
        {open ? "− Fewer" : "+ More trackers"}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {extras.map((type) => {
            const def = EVENT_DEFS[type];
            return (
              <button
                key={type}
                onClick={() => onPick(type)}
                className="tap flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 active:bg-gray-50"
              >
                <span className="text-2xl">{def.emoji}</span>
                <span className="text-[11px] font-medium text-gray-600">{def.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ e, onClick }: { e: EventRow; onClick: () => void }) {
  const def = EVENT_DEFS[e.type];
  const isDuration = def.kind === "duration";
  const duration =
    isDuration && e.end_time ? humanDuration((+new Date(e.end_time) - +new Date(e.start_time)) / 1000) : null;
  // start–end range for durations; single time for point events
  const timeText = isDuration
    ? `${clockTime(e.start_time)} – ${e.end_time ? clockTime(e.end_time) : "now"}`
    : clockTime(e.start_time);
  const isNursing = e.type === "feed_breast";
  const comment = [summarizeEvent(e.type, e.data), e.note].filter(Boolean).join(" · ");
  return (
    <button
      onClick={onClick}
      className="tap flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-left active:bg-gray-50"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${def.color} text-white`}>
        {def.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{def.label}</p>
        {/* time (left) and duration (right) — same size & weight, space-between */}
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-bold leading-tight text-gray-900">{timeText}</span>
          {duration && <span className="shrink-0 text-lg font-bold leading-tight text-gray-500">{duration}</span>}
        </div>
        {isNursing ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {nursingSides(e.data).map(({ side, seconds }) => (
              <span key={side} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SIDE[side].soft}`}>
                {SIDE[side].label}
                {seconds ? ` · ${sideDuration(seconds)}` : ""}
              </span>
            ))}
            {e.note && <span className="truncate text-xs text-gray-400">{e.note}</span>}
          </div>
        ) : (
          comment && <p className="mt-0.5 truncate text-xs text-gray-400">{comment}</p>
        )}
      </div>
    </button>
  );
}

function groupByDay(events: EventRow[]): [string, EventRow[]][] {
  const map = new Map<string, EventRow[]>();
  for (const e of events) {
    const key = dayLabel(e.start_time);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}
