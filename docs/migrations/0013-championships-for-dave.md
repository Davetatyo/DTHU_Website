# Migration 0013 (Bajnokságok): what to run, Dave

**File:** [`supabase/migrations/0013_championships.sql`](../../supabase/migrations/0013_championships.sql)
**Needed by:** branch `feature/tournament-pairing`, and `feature/player-stats` which is built on it.
**When:** before either branch is merged into `main`. The new code reads these columns and tables,
so deploying it first would break the Bajnokságok pages.
**Risk:** low. Everything is additive: nothing is dropped, renamed or rewritten. The Időpontfoglaló
and the Karnyx league keep working as they do today.

## How to run it

1. Supabase Dashboard → **SQL Editor** → New query.
2. Paste the whole content of `0013_championships.sql` and click **Run**. It should finish with
   "Success. No rows returned".
3. Run the checks below.
4. Tell Árpád it's done, so the branches can be merged and pushed.

Run it **once**. Almost every statement is safe to repeat, except the `create policy` line: on a
second run it fails with *policy "match_reports public read" already exists*. If you see that error,
the migration had already run and nothing is broken.

## What it changes

**`tournaments`: 7 new columns.** Existing rows get the defaults below, so the Karnyx league is
unaffected.

| Column | Default for existing rows | Meaning |
|---|---|---|
| `format` | `'manual'` | Pairing format. `manual` = Karnyx import (today's behaviour); `swiss` is the one playable on the site. |
| `best_of` | `1` | Games per match (3 and 5 reserved for later). |
| `settings` | `{}` | Format settings, e.g. number of rounds and days per round. |
| `slug` | null | Address of a championship page, `/bajnoksagok/<slug>`. Unique. |
| `status` | `'draft'` | Championship lifecycle: draft → registration → running → finished. The Karnyx league ignores it and keeps using `is_active`. |
| `starts_at` | null | When sign-up closes and the championship starts. |
| `auto_pairing` | `true` | Pair the next round automatically when all results are in. |

**`matches`: 2 new columns.** `winner_id` (who won) and `is_draw` (default false). Existing matches get
null and false.

**New table `match_reports`.** One result report per championship match: outcome, both players' final
HP, played and banned heroes, who submitted it, who confirmed it and when. A player submits and the
opponent confirms or corrects; admin reports are locked immediately. **Public read** policy, like the
other tournament tables. Writes go only through the server.

**New table `tournament_registrations`.** Sign-ups with 3 heroes per player. RLS is on with **no read
policy**, so hero picks stay secret until the start and only the server can read them.

## Checks after running (read-only)

```sql
-- 1. Seven new tournament columns exist (expect 7 rows)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'tournaments'
  and column_name in ('format','best_of','settings','slug','status','starts_at','auto_pairing');

-- 2. Existing tournaments kept their behaviour (expect every row: manual / draft)
select name, format, status, is_active from public.tournaments;

-- 3. Both new tables exist and are empty (expect 0 and 0)
select (select count(*) from public.match_reports)            as reports,
       (select count(*) from public.tournament_registrations) as registrations;
```

## If it has to be undone

Only safe **before** anyone has used the Bajnokságok (no championships, sign-ups or reports yet). After
that, these statements also delete that data.

```sql
drop table if exists public.tournament_registrations;
drop table if exists public.match_reports;
alter table public.matches drop column if exists winner_id, drop column if exists is_draw;
alter table public.tournaments
  drop column if exists format, drop column if exists best_of, drop column if exists settings,
  drop column if exists slug, drop column if exists status, drop column if exists starts_at,
  drop column if exists auto_pairing;
```

After running the migration, record it in STATE.md → Database (we'll do that in the merge commit).
