"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { EVENT_DEFS, EventType, liveNursing, sideDuration } from "@/lib/events";
import { stopwatch } from "@/lib/format";
import { useChildSocket } from "./useChildSocket";

type EventRow = {
  id: string;
  type: EventType;
  start_time: string;
  end_time: string | null;
  data: any;
};

// A sticky banner shown on every child page EXCEPT the timeline (which renders
// its own richer in-progress banners). Keeps any running timer visible and one
// tap away as you browse the app. Stays live via the child's WebSocket channel.
export default function ActiveTimers({ childId }: { childId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const onTimeline = pathname === `/child/${childId}`;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ events: EventRow[] }>(`/api/children/${childId}/events?limit=50`)
      .then((r) => !cancelled && setEvents(r.events))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [childId]);

  useChildSocket(
    childId,
    useCallback((msg: any) => {
      if (msg.kind === "event.created" || msg.kind === "event.updated") {
        setEvents((l) => [msg.event, ...l.filter((x) => x.id !== msg.event.id)]);
      } else if (msg.kind === "event.deleted") {
        setEvents((l) => l.filter((x) => x.id !== msg.id));
      }
    }, [])
  );

  // the timeline already shows these; don't double up there
  if (onTimeline) return null;

  const inProgress = events.filter((e) => !e.end_time && EVENT_DEFS[e.type]?.kind === "duration");
  if (!inProgress.length) return null;

  return (
    <div className="sticky top-0 z-30 space-y-1.5 bg-surface/85 px-4 pb-1.5 pt-2 backdrop-blur">
      {inProgress.map((e) => {
        const isNursing = e.type === "feed_breast";
        const href = `/child/${childId}${isNursing ? "?open=nursing" : ""}`;
        let detail: string;
        if (isNursing) {
          const { left, right, active } = liveNursing(e.data, now);
          const parts = [];
          if (left) parts.push(`L ${sideDuration(left)}`);
          if (right) parts.push(`R ${sideDuration(right)}`);
          detail = `${parts.join(" · ") || "starting…"}${active ? "" : " · paused"}`;
        } else {
          detail = stopwatch((now - +new Date(e.start_time)) / 1000);
        }
        return (
          <button
            key={e.id}
            onClick={() => {
              router.push(href);
              router.refresh();
            }}
            className={`tap flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left text-white active:opacity-90 ${
              isNursing ? "bg-rose-500" : "bg-brand-600"
            }`}
          >
            <span className="text-sm font-medium">
              {EVENT_DEFS[e.type].emoji} {EVENT_DEFS[e.type].label} · {detail}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800">Open</span>
          </button>
        );
      })}
    </div>
  );
}
