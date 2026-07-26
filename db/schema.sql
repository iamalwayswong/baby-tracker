-- Baby Tracker schema. See DESIGN.md §3.
-- Safe to run repeatedly (idempotent).

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  name          text not null,
  created_at    timestamptz not null default now()
);

create table if not exists children (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  birth_date  date,
  sex         text not null default 'unspecified',  -- 'male' | 'female' | 'unspecified'
  created_by  uuid not null references users(id),
  created_at  timestamptz not null default now()
);

-- many-to-many: which users care for which children, and in what role
create table if not exists caregivers (
  child_id  uuid not null references children(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  role      text not null default 'caregiver',      -- 'owner' | 'caregiver'
  joined_at timestamptz not null default now(),
  primary key (child_id, user_id)
);

create table if not exists invites (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children(id) on delete cascade,
  invited_by uuid not null references users(id),
  email      text not null,
  token      text not null unique,
  status     text not null default 'pending',       -- 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists password_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token      text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_token_idx on password_resets (token);

-- the shared timeline: nearly everything a parent logs is an event
create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children(id) on delete cascade,
  type       text not null,                          -- see lib/events.ts
  start_time timestamptz not null default now(),
  end_time   timestamptz,                            -- null while in progress (running timer)
  data       jsonb not null default '{}'::jsonb,     -- type-specific fields
  note       text,
  created_by uuid not null references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Soft delete: deleting an event sets deleted_at instead of removing the row,
-- so history is retained for tracking. All list queries filter deleted_at is null.
alter table events add column if not exists deleted_at timestamptz;

create index if not exists events_child_start_idx on events (child_id, start_time desc);
-- fast lookup of "what's in progress right now" for a child (only live rows)
create index if not exists events_in_progress_idx on events (child_id) where end_time is null and deleted_at is null;
-- timeline reads only non-deleted rows
create index if not exists events_active_idx on events (child_id, start_time desc) where deleted_at is null;
create index if not exists caregivers_user_idx on caregivers (user_id);
