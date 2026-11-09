# XP and levels (Tapasztalati pontok)

| | |
|---|---|
| Folder | `src/features/xp/` |
| Branch | `feature/xp` |
| Routes | Profilom card, header bar, popups in the layouts; admin: `/meccsszervezo/admin/xp` |
| Status | **Step 1 live for admins (v2.31, 2026-11-08)** until `XP_ADMINS_ONLY` in `lib/rules.ts` is false |
| Plan | `Features_Roadmap.md` → R4 (all agreed values, owner's updates of 2026-11-08) |

## What step 1 does

- **Levels:** start at 0; level n → n+1 costs `25 + 20·n` (25, 45, 65…, level 20 = 4,300 XP). The
  admin page can change the two numbers. `lib/levels.ts`.
- **Automatic:** 15 XP to both players when a match is marked Lejátszottuk (`setMatchPlayed` →
  `awardMatchPlayed`).
- **Admin, at the end of a tournament** ("Verseny XP kiosztása"): 30 XP to everyone who played or had
  a Bye in every round (`lib/finishers.ts`), 15 XP per Bye, and the podium XP (300 / 200 / 150).
  Safe to press again.
- **Admin, by hand:** give or take XP with a reason (e.g. live events, until those get their own button).
- **Admin settings:** amounts and on/off per activity, the curve, double XP (a whole tournament, or a
  time window for chosen activities). Every change goes to `audit_log`.
- **Look (owner's choices from the mockups, 2026-11-08):** Profilom level card (option A) on top with
  the big bar and the next reward behind a curtain; a thin bar under the name in the header; new XP
  shows once as a card in the corner ("1. XP értesítő"); reaching a level shows the fireworks popup,
  with the new badge when the level has one (no curtain in the popup). "Felveszem" uses the admin
  try-on for now (the Gyűjtemény replaces it in step 2).

## How it works

Every XP change is a row in `xp_events` (migration `0012_xp.sql`). Only the server can add rows, and
only through two database functions: `xp_award` (the amount comes from `xp_activities`, double XP from
`xp_boosts`, and a unique key per player + activity + reference refuses duplicates) and
`xp_admin_adjust` (hand-given, with a reason, never below zero). A total is the sum of the rows;
the level is worked out in code. `seen_at` marks what the player has already been shown.

If migration 0012 hasn't run, nothing breaks: reads return zero or the defaults, awarding logs and
gives 0, the admin page says so.

## Not in step 1 (see R4's build plan)

Gyűjtemény and real badge wearing, podium badge sets per tournament, the featured game of the day,
the news thumbs-up, tutorial XP, daily quiz XP (Árpád's quiz: call `awardXp(profileId,
"daily_quiz", "quiz:<day>")` on a correct answer), a live-event button in the Eseménynaptár.

## Opening it to everyone (with the full site)

1. Wipe the test XP in the Supabase SQL Editor: `delete from public.xp_events;` (owner's decision:
   everyone starts at level 0).
2. Set `XP_ADMINS_ONLY` to false and deploy.
