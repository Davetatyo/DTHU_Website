# Migration 0014 (Játszmák / games): what to run, Dave

**File:** [`supabase/migrations/0014_games.sql`](../../supabase/migrations/0014_games.sql)
**Needed by:** branch `feature/match-reporting` (R17 Meccs jelentése, plan in
[`docs/r17-match-reporting-plan.md`](../r17-match-reporting-plan.md)).
**When:** before that branch is merged into `main`. Running it earlier is fine and changes nothing
anyone can see: today's code never reads the new table or columns.
**Needs:** 0013 (Bajnokságok), which has already run.
**Risk:** low. Everything is additive: nothing is dropped, renamed or rewritten. The Időpontfoglaló,
the Bajnokságok and the Játékosok stats keep working as they do today.

## How to run it

1. Supabase Dashboard → **SQL Editor** → New query.
2. Paste the whole content of `0014_games.sql` and click **Run**. It ends with one small result table,
   `championship_games`. **0 is the expected number** (no championship result was locked yet on
   2026-11-14); any number is fine.
3. Run the checks below.
4. Tell Árpád it's done.

It's safe to run twice: the second run skips what already exists and copies nothing again. It runs as
one transaction, so if anything fails, nothing is changed at all (send Árpád the error text).

## What it changes

**`players`: new column `profile_id`.** Links a tournament player to their website account. Until
now a player's tournament entry was matched to their account by Karnyx name only, which breaks if
someone renames themselves in Profilom mid-championship. The migration fills it for championship
players from their sign-up. Karnyx-league players (the pasted pairings) stay empty on purpose.

**`tournaments`: new column `rated`** (default `true`): whether a tournament's games will count for the
ranking (R18). Nothing uses it yet.

**New table `games`.** One row per real game, the single source for stats now and for the ranking later:
- casual and ranked games that players report themselves (one reports, the other confirms or
  corrects; unanswered reports expire after 7 days, never as an automatic win);
- championship games, copied automatically when a Bajnokságok result is locked.

**New table `game_events`.** The history of every game (reported, corrected, confirmed, cancelled,
expired, voided, admin edits with their reason). It can't be edited or deleted; a trigger refuses it,
like the existing `audit_log`.

**Seven new functions** (`game_report`, `game_respond`, `game_cancel`, `game_expire`, `game_void`,
`game_admin_edit`, `game_from_match`), plus two small helpers and the history trigger. Every change to a game goes through them,
so each check, update and history row happens together. Only the website's server can call them, the
same as the coin and ticket functions.

Both new tables have row level security **on with no read policy**: pending games are private to the
two players and admins, so only the server reads them and decides who sees what.

## Checks after running (read-only)

```sql
-- 1. Both new tables exist (expect two rows: games, game_events)
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('games', 'game_events');

-- 2. The new columns exist (expect two rows: players.profile_id, tournaments.rated)
select table_name, column_name from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'players' and column_name = 'profile_id')
    or (table_name = 'tournaments' and column_name = 'rated'));

-- 3. Karnyx-league players were not touched (expect 0 for the manual tournaments)
select t.name, t.format, count(p.profile_id) as linked, count(*) as players
from public.players p join public.tournaments t on t.id = p.tournament_id
group by t.name, t.format;

-- 4. The functions exist (expect 10)
select count(*) from pg_proc
where pronamespace = 'public'::regnamespace and proname like 'game\_%';
```

## Good to know

- A profile that has games can't be deleted (also not by deleting the user under Authentication), so
  their opponents' history stays intact. Banning is the tool for problem accounts. If a deletion is
  ever really needed, ask Árpád first.
- Deleting a championship deletes its games and their history with it, the same way it already deletes
  its rounds and matches.

## If it has to be undone

Only safe **before** anyone has reported a game. After that, these statements also delete that data.

```sql
drop table if exists public.game_events;
drop table if exists public.games;
drop function if exists public.game_events_immutable(), public.game_log(uuid, text, uuid, text),
  public.game_check_played_at(timestamptz, timestamptz),
  public.game_report(uuid, text, text, uuid, uuid, jsonb),
  public.game_respond(uuid, uuid, timestamptz, jsonb), public.game_cancel(uuid, uuid),
  public.game_expire(timestamptz), public.game_void(uuid, uuid, text),
  public.game_admin_edit(uuid, uuid, jsonb, text), public.game_from_match(uuid, uuid);
alter table public.players drop column if exists profile_id;
alter table public.tournaments drop column if exists rated;
```
