-- DTHU: Hírek (news articles).
-- Run: Supabase Dashboard → SQL Editor → paste and run, BEFORE deploying the code that needs it.
-- Only adds things (a new table and a storage bucket). Safe to run twice.

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  -- Address of the article: /hirek/<slug>. Set once from the title, never changes.
  slug text not null unique,
  title text not null,
  -- tournament = Bajnokság, community = Közösség, live = Élő esemény,
  -- site = Oldal / fejlesztés, shop = Jegyek & Bolt (offered later)
  category text not null default 'community' check (category in ('tournament', 'community', 'live', 'site', 'shop')),
  -- "Bevezető": 1–2 sentences on the card and in bold at the top of the article
  lead text,
  -- Article content: a list of blocks (paragraph, list, quote, picture, gallery, video …)
  body jsonb not null default '[]'::jsonb,
  -- Card picture in the "news-images" bucket
  cover_path text,
  -- Pinned articles come first until an admin unpins them
  pinned boolean not null default false,
  -- null = draft; in the future = scheduled; in the past = published
  published_at timestamptz,
  -- Last save while already published: shown as "Frissítve"
  edited_at timestamptz,
  -- Shown on the article with their profile picture
  author_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_published_at_idx on public.news (published_at desc);

-- No policies on purpose: drafts must stay hidden, so the site reads and writes news only
-- through its server (service role), which checks admin rights and publish dates.
alter table public.news enable row level security;

-- Pictures for news cards and articles. Public read; writes only through the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
