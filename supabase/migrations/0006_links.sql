-- DTHU: Linkek (community links), managed by admins.
-- Run: Supabase Dashboard → SQL Editor → paste and run, BEFORE deploying the code that needs it.
-- Only adds things (a new table, the four links the page showed so far, a storage bucket).
-- Safe to run twice.

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  -- Optional short line under the title
  description text,
  -- Optional picture in the "link-images" bucket (16:9); without it the tile shows colours
  image_path text,
  -- Order on the page (smallest first)
  sort_order integer not null default 0,
  -- false = hidden from the Linkek page, kept for later
  visible boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No policies on purpose: the site reads and writes links only through its server.
alter table public.links enable row level security;

-- The links the page showed before (fixed ids, so running this twice adds nothing).
insert into public.links (id, title, url, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'Dice Throne', 'https://www.dicethrone.com/', 10),
  ('00000000-0000-4000-8000-000000000002', 'Discord szerver', 'https://discord.gg/Y5mJ6Sewy', 20),
  ('00000000-0000-4000-8000-000000000003', 'Facebook csoport', 'https://www.facebook.com/groups/dicethronehungary', 30),
  ('00000000-0000-4000-8000-000000000004', 'Karnyx', 'https://karnyx.app/', 40)
on conflict (id) do nothing;

-- Pictures for link tiles. Public read; writes only through the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('link-images', 'link-images', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
