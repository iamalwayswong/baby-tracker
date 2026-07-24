# Baby Tracker — Design Doc

An all-in-one parenting & baby-tracking web app for tracking **sleep, feeding, diapers, and growth**.
Built for a small circle of friends & family. Inspired by Huckleberry, but self-hosted and free for us.

**Core differentiator we care about:** two parents share one child on a single **live timeline** —
when Mom logs a feed, Dad sees it instantly.

---

## 1. Product principles

1. **One-handed at 3am.** Logging the common things (feed / sleep / diaper) is one or two taps. Mobile-first.
2. **One shared truth per child.** Both parents write to the same timeline in real time. No merge conflicts, no "whose phone has the data."
3. **In-progress states matter.** "Baby has been asleep since 2:14, started by Dad" is a first-class thing, not an afterthought.
4. **Track first, insights later.** Get accurate logging rock-solid; predictions/analytics build on top of clean data.

---

## 2. Accounts & sharing model

This is the heart of the app.

- **User** — an individual person with their own login (email + password). One user can be a caregiver on multiple children.
- **Child** — a shared entity (name, birth date, sex). Sex is needed for growth percentiles.
- **Caregiver** — the many-to-many link between users and children, with a **role**:
  - `owner` — created the child, can invite/remove caregivers, delete the child.
  - `caregiver` — full read/write on the timeline, cannot manage other caregivers.
- **Invite** — owner enters the other parent's email → app generates a tokenized invite link → other parent signs up / logs in and accepts → they become a `caregiver` on that child.

So the target use case ("2 parents, 1 kid") is just: owner creates child, invites partner, both now share the live timeline. The model also supports grandparents/nannies later at no extra design cost.

---

## 3. The data model

**Key idea:** almost everything the user logs is an **Event** on a child's timeline. One flexible events table keeps the schema small and lets us add new tracker types without migrations.

### Tables

```
users
  id            uuid pk
  email         text unique
  password_hash text
  name          text
  created_at    timestamptz

children
  id            uuid pk
  name          text
  birth_date    date
  sex           text          -- 'male' | 'female' | 'unspecified' (for percentiles)
  created_by    uuid -> users
  created_at    timestamptz

caregivers                    -- many-to-many: users <-> children
  child_id      uuid -> children
  user_id       uuid -> users
  role          text          -- 'owner' | 'caregiver'
  joined_at     timestamptz
  primary key (child_id, user_id)

invites
  id            uuid pk
  child_id      uuid -> children
  invited_by    uuid -> users
  email         text
  token         text unique
  status        text          -- 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at    timestamptz
  created_at    timestamptz

events                        -- the shared timeline
  id            uuid pk
  child_id      uuid -> children
  type          text          -- see event types below
  start_time    timestamptz   -- for point events, the moment; for durations, the start
  end_time      timestamptz   -- null while in progress (sleep/feed timer running)
  data          jsonb         -- type-specific fields (see below)
  note          text
  created_by    uuid -> users -- who logged it
  updated_by    uuid -> users
  created_at    timestamptz
  updated_at    timestamptz
```

Indexes: `events (child_id, start_time desc)` for the timeline; partial index on `events (child_id) where end_time is null` for "what's in progress right now."

### Event types & their `data` payloads

| type          | duration? | `data` fields                                              |
|---------------|-----------|------------------------------------------------------------|
| `sleep`       | yes       | `{}` (start/end say it all)                                |
| `feed_breast` | yes       | `{ left_seconds, right_seconds, last_side }`               |
| `feed_bottle` | point     | `{ volume_ml, contents: 'breastmilk'|'formula'|'mixed' }`  |
| `feed_solid`  | point     | `{ foods: [], amount: 'some'|'lots' }`                     |
| `pump`        | point     | `{ left_ml, right_ml }`                                    |
| `diaper`      | point     | `{ kind: 'wet'|'dirty'|'mixed', color, consistency }`      |
| `growth`      | point     | `{ weight_g, height_cm, head_cm }`                         |
| `medicine`    | point     | `{ name, dose, unit }`                                     |
| `temperature` | point     | `{ celsius, method }`                                      |
| `activity`    | yes       | `{ kind: 'tummy_time'|'play'|'bath'|... }`                 |
| `potty`       | point     | `{ kind: 'pee'|'poo', success }`                           |
| `milestone`   | point     | `{ label, photo_url }`                                     |

This one table covers all three tiers. New tracker = new `type` string, no migration.

---

## 4. Architecture

- **Frontend:** Next.js (React), mobile-first, installable **PWA** (service worker + manifest, add-to-home-screen, offline-tolerant logging).
- **Backend:** custom Node service (Next.js API routes or a small Express/Fastify service) over **PostgreSQL**.
- **Realtime:** a **WebSocket** channel per `child_id`. On any event create/update/delete, the server broadcasts to all connected caregivers of that child. Also carries **presence** (who's online) and **live timer** state ("sleep in progress since …").
- **Auth:** email + password (hashed with bcrypt/argon2), session via httpOnly cookie or JWT. Invite links carry a signed token.
- **Notifications (Tier 2):** Web Push via the service worker + VAPID keys for reminders (feed due, nap window opening).
- **Offline (PWA):** queue events created while offline in IndexedDB, replay to the server on reconnect. Events carry a client-generated id to make replay idempotent.

### Hosting (decided)
- **Railway** for everything. Railway runs a **persistent Node process**, so WebSockets and in-memory running-timer/presence state work without serverless workarounds.
- **One Railway service:** the Next.js app on a custom Node server, with the WebSocket server attached to the *same* HTTP server (one process, one port, one deploy).
- **One Railway Postgres** plugin for the database; connection string injected via env var.
- Split the WebSocket server into its own Railway service later only if load demands it — the code is structured to make that a cheap move.

```
[ PWA (Next.js/React) ] --- REST (writes/reads) --->  [ Node API ] --- SQL ---> [ Postgres ]
        |                                                   |
        \--------------- WebSocket (per child_id) ----------/
             (live events, presence, running timers, push triggers)
```

---

## 5. Feature roadmap (build order)

### Tier 1 — MVP (build first; schema already supports the rest)
- [ ] Auth: sign up / log in / log out (email + password)
- [ ] Create a child; invite second parent by email link; accept invite
- [ ] Fast logging: **sleep** (start/stop timer), **feed** (breast timer L/R, bottle volume, solids), **diaper**, **pump**
- [ ] **Live shared timeline / "Today" view** both parents see, with realtime updates
- [ ] In-progress states + running timers (started-by attribution)
- [ ] **Growth** log with weight/height/head + percentile charts (WHO/CDC reference data)
- [ ] Basic daily/weekly summaries (total sleep, # feeds, # diapers)
- [ ] PWA install + offline logging queue

### Tier 2 — the sticky stuff
- [ ] Wake-window tracking + **next-nap predictor** (age-based wake windows blended with the child's own recent pattern) — our "SweetSpot-lite"
- [ ] Reminders / web-push notifications (feed due, nap window)
- [ ] Insights dashboard (trends, patterns over time)
- [ ] Notes & photos on events

### Tier 3 — stretch
- [ ] Predictions that learn individual patterns more deeply
- [ ] Data export (PDF/CSV for the pediatrician)
- [ ] Milestones / memories feed

---

## 6. Open questions to revisit later
- Units: metric vs imperial toggle (lb/oz vs grams, °F vs °C) — US friends will want imperial display.
- Percentile source: WHO (0–2y) vs CDC (2y+) growth charts — bundle the reference tables.
- Do we want a simple audit trail (who edited what) beyond `updated_by`?
- How long to keep in-progress timers alive if a parent forgets to stop one?
```
