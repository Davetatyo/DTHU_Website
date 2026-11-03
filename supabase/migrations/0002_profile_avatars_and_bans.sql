-- DTHU: profile pictures (avatars) and banning users.
-- Run: Supabase Dashboard → SQL Editor → paste and run, BEFORE deploying the code that needs it.
-- Only adds things (new columns, a storage bucket), so the live site keeps working either way.
-- Safe to run twice.

-- Where the user's profile picture is in the "avatars" bucket (null = default icon).
alter table public.profiles add column if not exists avatar_path text;

-- Banned users can't log in or use the site. The Discord account stays banned even if they
-- log in again (the profile row is kept, only marked).
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists banned_by uuid references public.profiles (id) on delete set null;

-- Storage bucket for the pictures. Public read, so <img> tags can load them; writes only
-- through the website's server (service role), which checks permissions first. The bucket
-- itself rejects files over 300 KB and anything that isn't an image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 307200, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
