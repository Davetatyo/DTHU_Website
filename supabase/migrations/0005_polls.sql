-- DTHU: polls (Szavazás) inside news articles.
-- Run: Supabase Dashboard → SQL Editor → paste and run, BEFORE deploying the code that needs it.
-- Only adds things (two new tables). Safe to run twice.

-- One poll, set up in a news article's editor ("Szavazás indítása").
create table if not exists public.polls (
  id uuid primary key,
  -- The article the poll lives in; deleting the article deletes its polls and votes.
  news_id uuid not null references public.news (id) on delete cascade,
  question text not null,
  -- [{"id": "a1", "label": "…"}]; option ids never change, so editing a label keeps the votes
  options jsonb not null default '[]'::jsonb,
  -- false = one choice, true = several choices
  multi boolean not null default false,
  -- Adds an "Egyéb" choice with a text box
  allow_other boolean not null default false,
  -- Voting closes at this time; results are final after it
  closes_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists polls_news_id_idx on public.polls (news_id);

-- One row per voter and poll; changing the vote updates the row until the poll closes.
create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Chosen option ids; "_other" = Egyéb
  choices text[] not null default '{}',
  -- The typed "Egyéb" answer (shown publicly without a name)
  other_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

-- No policies on purpose: votes are anonymous and only the site's server (service role) reads
-- and writes them, after checking the login, the closing time and the choices.
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
