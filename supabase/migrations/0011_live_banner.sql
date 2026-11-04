-- 0011 · Live banner ("Élő adás"): which Discord voice channels count as tournament channels, and
-- which matches are live. Feature guide: src/features/live-banner/README.md.
-- Run: Supabase Dashboard → SQL Editor → paste the whole file → Run, BEFORE deploying the code
-- that needs it. Only adds two new tables, changes nothing that exists. Safe to run twice.
-- Runs in one transaction: if anything fails, nothing is created.

begin;

-- The tournament voice channels, edited on the admin page. The Discord bot only reports who is
-- in these channels, and the banner links to their join_url.
create table if not exists public.live_channels (
  discord_channel_id text primary key check (discord_channel_id ~ '^[0-9]{15,25}$'),
  name text not null check (char_length(name) between 1 and 60),
  join_url text check (join_url is null or join_url ~ '^https://(discord\.com|discord\.gg)/'),
  sort_order integer not null default 0,
  -- When the bot last reported. Shown on the admin page to tell whether the bot is connected.
  last_report_at timestamptz,
  created_at timestamptz not null default now()
);

-- One row per match that has gone live. Whether it is live right now is worked out when read
-- (src/features/live-banner/lib/rules.ts), so nothing has to switch the banner off.
create table if not exists public.match_live (
  match_id uuid primary key references public.matches (id) on delete cascade,
  channel_id text references public.live_channels (discord_channel_id) on delete set null,
  started_at timestamptz not null default now(),
  -- Last time the bot saw one of the match's players in a tournament channel.
  last_seen_at timestamptz not null default now(),
  -- Set when an admin stops the banner by hand. The bot can't restart a stopped match.
  ended_at timestamptz,
  source text not null default 'voice' check (source in ('voice', 'admin'))
);

create index if not exists match_live_last_seen_idx on public.match_live (last_seen_at);

-- No policies on purpose: only the server (service role) reads and writes these.
alter table public.live_channels enable row level security;
alter table public.match_live enable row level security;

commit;
