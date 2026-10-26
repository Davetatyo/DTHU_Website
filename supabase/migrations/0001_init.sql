-- DT Match Organizer: kezdeti adatbázis séma
-- Futtatás: Supabase Dashboard → SQL Editor → illeszd be és futtasd.

-- Felhasználói profil (Discord bejelentkezéssel jön létre)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  discord_id text unique,
  discord_username text,
  display_name text,
  karnyx_name text,
  facebook_name text,
  timezone text not null default 'Europe/Budapest',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Egy Karnyx becenevet csak egy felhasználó foglalhat le (kis/nagybetű nem számít)
create unique index profiles_karnyx_name_key on public.profiles (lower(karnyx_name));

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- A verseny játékosai (Karnyx név + a 3 hős), a beillesztett párosításokból
create table public.players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  karnyx_name text not null,
  heroes text[] not null default '{}',
  created_at timestamptz not null default now()
);

create unique index players_tournament_name_key on public.players (tournament_id, lower(karnyx_name));

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  number int not null,
  starts_at timestamptz not null default now(),
  deadline timestamptz not null,
  closed_at timestamptz,
  completed_at timestamptz,
  deadline_warning_sent boolean not null default false,
  unique (tournament_id, number)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  table_no int not null,
  player_a_id uuid not null,
  player_b_id uuid,
  status text not null default 'pending'
    check (status in ('pending', 'proposed', 'confirmed', 'played', 'bye')),
  scheduled_at timestamptz,
  played_at timestamptz,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_player_a_fkey foreign key (player_a_id) references public.players (id) on delete cascade,
  constraint matches_player_b_fkey foreign key (player_b_id) references public.players (id) on delete cascade
);

create index matches_round_idx on public.matches (round_id);
create index matches_scheduled_idx on public.matches (scheduled_at);

-- Időpont javaslatok: egy javaslatkör több időpontot tartalmazhat
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  proposed_by uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open', 'accepted', 'declined', 'superseded')),
  created_at timestamptz not null default now()
);

create index proposals_match_idx on public.proposals (match_id);

-- Hozzáférés: mindenki olvashatja a versenyadatokat, a profilokat csak bejelentkezett
-- felhasználók. Írni csak a szerver tud (service role kulccsal), ami ellenőrzi a jogosultságot.
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.matches enable row level security;
alter table public.proposals enable row level security;

create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "tournaments public" on public.tournaments for select using (true);
create policy "players public" on public.players for select using (true);
create policy "rounds public" on public.rounds for select using (true);
create policy "matches public" on public.matches for select using (true);
create policy "proposals public" on public.proposals for select using (true);
