-- Vesper: public directory + live relay. Message history is NEVER stored here.
-- pending_events are deleted as soon as the recipient acknowledges them.

create table if not exists profiles (
  user_id      text primary key,
  username     text not null,
  display_name text not null,
  photo_data   text,
  last_seen    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_idx on profiles (lower(username));

create table if not exists conversations (
  id         text primary key,
  kind       text not null,
  title      text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists conversation_members (
  conversation_id text not null,
  user_id         text not null,
  role            text not null default 'member',
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on conversation_members (user_id);

create table if not exists pending_events (
  id              text primary key,
  conversation_id text not null,
  from_user_id    text not null,
  to_user_id      text not null,
  kind            text not null,
  payload         text not null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz
);
create index if not exists pending_events_inbox_idx on pending_events (to_user_id, created_at);

create table if not exists blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
