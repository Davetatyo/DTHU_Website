-- DTHU: Eseménynaptár events (live tournaments, community days, other programmes).
-- Run: Supabase Dashboard → SQL Editor → paste and run, BEFORE deploying the code that needs it.
-- Only adds things (a new table and a storage bucket). Safe to run twice.
-- Online tournament rounds are not stored here: the calendar reads them from public.rounds.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  -- Address of the event page: /esemenynaptar/<slug>. Set once from the title, never changes.
  slug text not null unique,
  title text not null,
  -- online = online event typed in by hand (rounds come automatically), live = Élő verseny,
  -- community = Asztali nap / közösségi játék, other = Egyéb
  kind text not null default 'other' check (kind in ('online', 'live', 'community', 'other')),
  -- "Ötlet / tervezett": not fixed yet
  tentative boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz,
  -- true: only the date matters (no start time shown)
  all_day boolean not null default false,
  location text,
  -- Short text on the card and at the top of the event page
  summary text,
  -- Event page content: a list of simple blocks (heading, paragraph, picture, link)
  body jsonb not null default '[]'::jsonb,
  -- Card picture in the "event-images" bucket
  cover_path text,
  -- The event's own website / sign-up page
  link_url text,
  -- true: only a card that links to link_url, no event page
  card_only boolean not null default false,
  -- Pinned events are shown first
  pinned boolean not null default false,
  -- null = draft; in the future = scheduled; in the past = live
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_starts_at_idx on public.events (starts_at);

-- No policies on purpose: drafts must stay hidden, so the site reads and writes events only
-- through its server (service role), which checks admin rights and publish dates.
alter table public.events enable row level security;

-- Pictures for event cards and event pages. Public read; writes only through the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
