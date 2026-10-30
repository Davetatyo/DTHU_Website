# Meccsszervező (match organizer) feature guide

The Meccsszervező is the live feature of the DTHU website: it was its own app
(github.com/Davetatyo/DT_Match_Organizer, v1.0–v1.2) and became a feature of this repository in
v2.0. Read [CLAUDE.md](../CLAUDE.md) for how the project as a whole works and
[STATE.md](../STATE.md) for where things stand. This file is the feature's domain knowledge:
what it does, how it works and the rules agreed with the owner.

- Pages: `src/app/meccsszervezo/` (URLs under `/meccsszervezo`, see `src/lib/routes.ts`)
- Code: `src/features/match-organizer/` (`lib/`, `components/`, `actions/`)
- Site-wide pieces it uses: `src/lib/auth.ts`, `src/lib/site.ts`, `src/lib/supabase/server.ts`,
  `src/app/auth/*` (Discord login), `src/app/api/calendar`, `src/app/api/cron/reminders`

## 1. What the app is for


The Hungarian Dice Throne community ("Dice Throne Hungary", DTHUN) runs online tournaments.
Pairings and results are handled in **Karnyx** (karnyx.app). Players talk in a Facebook group
and play on Discord. The problem this app solves:

- Karnyx shows Karnyx nicknames, Facebook shows real names, Discord shows Discord names, so
  players couldn't find their opponent. The app links the three per player.
- Players agree on a match time on the app (propose → opponent accepts).
- Everyone sees upcoming matches and can add them to Google/Apple/Outlook calendars.
- A Discord channel gets announcements and pings.

The app does **not** record results or standings. Those stay in Karnyx.

**Owner:** Dave (Discord `davetatyo`, Karnyx name `Dave`), tournament organiser and main admin.
**Language:** the whole UI is **Hungarian**. Code, comments and commit messages are English.

## 2. Architecture

### Request and data flow

- **Reads** happen in Server Components through helpers in `lib/data.ts`, using the
  **service client**. Pages decide what to show: Facebook/Discord names only render for
  signed-in visitors.
- **Writes** happen only in **Server Actions** (`actions/match.ts`, `actions/admin.ts`, `actions/profile.ts`). Every
  action first checks permission (`requireProfile` / `requireAdmin` in `src/lib/auth.ts`, plus
  "is this my match?" via `isParticipant`), then writes with the service client.
- **RLS** (see the migration) allows public `select` on tournament tables and authenticated
  `select` on `profiles`; there are no write policies. That protects the REST API, since the
  anon key is public.
- The browser never talks to the database directly.

### Auth

1. `/meccsszervezo/login` server action → `supabase.auth.signInWithOAuth({ provider: "discord" })`.
2. Discord → Supabase → `/auth/callback` (`src/app/auth/callback/route.ts`): exchanges the
   code, upserts `profiles` (Discord id, username, display name), applies
   `BOOTSTRAP_ADMIN_DISCORD`, then redirects to `/meccsszervezo/profil` if the profile isn't finished, else `/meccsszervezo`.
3. `src/middleware.ts` refreshes the session cookie on every page request (and applies the
   phase-1 gate, see `src/lib/site-mode.ts`).
4. A profile is "finished" once saved, i.e. `facebook_name` is set (`isProfileComplete` in
   `lib/profile.ts`). Players also have a `karnyx_name`; organisers and spectators choose
   "Nem játszom" and keep it `null`.

### Site URL

`getSiteUrl()` (`src/lib/site.ts`) builds the public URL from `x-forwarded-host`/`host`, so
login redirects, Discord links and calendar links are correct on any domain.
`NEXT_PUBLIC_SITE_URL` is only a fallback. A domain change needs no code change, but three
settings outside the code: the domain in Vercel; Supabase → Authentication → URL Configuration
(Site URL + `https://<domain>/auth/callback` in Redirect URLs, otherwise Discord login silently
lands on the Site URL and fails); and the `dt-reminders` job URL ([docs/setup.md](setup.md) §6), because the
old domain's redirect drops the `Authorization` header.

## 3. Code map

Paths below are relative to `src/features/match-organizer/` unless they start with `src/`.

```
src/app/meccsszervezo/        the pages (thin: data loading + JSX; logic lives in the feature)
  layout.tsx                  sub-site shell: SiteHeader with the Meccsszervező tabs, footer
  page.tsx                    Áttekintés: round banner, round timeline, matches as rows (default) or
                              tiles, "Következő meccsem", round progress
  login/page.tsx              Discord login
  profil/                     profile form (roster name, "Egyedi" typed name or "Nem játszom";
                              Facebook name; time zone)
  meccs/[id]/                 match page: versus banner, action bar (Lejátszottuk, copy message),
                              players, proposals, SlotPicker proposal form, admin tools
                              (set time, player swap, reset)
  menetrend/page.tsx          "Közelgő meccsek": confirmed upcoming matches by day + calendar subscribe
  gyik/page.tsx               FAQ (keep it in sync with behaviour!)
  admin/                      admin page; admin/felhasznalo/[id]: set or fix any user's Karnyx name
src/app/auth/callback|signout login route handlers (site-wide, never move: Supabase calls them)
src/app/api/calendar          .ics feed (all / ?player= / ?match=) — subscribed calendars use this URL
src/app/api/cron/reminders    48h-before-deadline Discord warning (Bearer CRON_SECRET)

actions/
  match.ts                    propose, accept, played, admin set time / swap / reset
  admin.ts                    tournaments, round import, deadline, reminders, admins, Karnyx names
  profile.ts                  save profile
components/
  MatchList                   MatchRow + grouped rows (by day / open / played / Bye, lib/schedule.ts)
  MatchupGrid                 hero-coloured picture tiles with scheduling state chips
  RoundTimeline               the tournament's rounds with progress
  SlotPicker                  day cards + typed time entry, posts hidden "slot" inputs. 1 slot (admin
                              set time): the visible day+time IS the choice, live. Several slots:
                              added chips, plus a typed-but-unadded time is sent too (dashed chip)
  ViewToggle                  Lista/Kártyák switch; choice kept in a cookie (`nezet` home,
                              `admin_nezet` admin), resolved server-side by lib/view.ts
  ImportForm                  Karnyx paste + Bye field + live preview
  KarnyxNameField             roster / Egyedi / Nem játszom picker (profile + admin user page)
  StatusBadge
lib/
  karnyx.ts                   parser for pasted Karnyx text + Bye names (pure, tested)
  notify.ts                   all Discord message texts (pure builders tested) + senders
  discord.ts                  webhook posting, mentions, 2000-char chunking
  data.ts                     read helpers;  rounds.ts  played/round-complete logic
  schedule.ts                 grouping matches for the row view (pure, tested)
  time.ts                     time zone conversion without libraries, Hungarian formatting,
                              picker days, countdown (pure, tested)
  ics.ts, calendar.ts         iCalendar + Google Calendar links (event UIDs must never change)
  profile.ts                  NOT_PLAYING, CUSTOM_NAME, isProfileComplete, cleanKarnyxName, resolveKarnyxChoice
  swap.ts                     planSwap: rules for the admin player swap (pure, tested)
  labels.ts, types.ts, view.ts
Site-wide, used by this feature:
  src/components/             SubmitButton (EVERY server-action submit), InfoTip, CopyButton,
                              HeroAvatar, icons, site/ (header, tabs, theme switch, footer)
  src/lib/                    auth.ts, routes.ts, site.ts, heroes.ts, supabase/server.ts, types.ts (Profile)
supabase/migrations/0001_init.sql   full schema + RLS (applied manually in the SQL editor)
```


## 4. Data model


Tables (see `supabase/migrations/0001_init.sql`):

- `profiles`: one per Discord login. `karnyx_name` unique (case-insensitive), `is_admin`,
  `timezone` (default `Europe/Budapest`).
- `tournaments`: `is_active` marks the current one (creating a new one deactivates others).
  Deleting a tournament cascades to everything below; profiles are kept.
- `players`: the roster per tournament (Karnyx name + 3 heroes), filled by round imports.
- `rounds`: `number`, `deadline`, `closed_at` (set when the next round starts),
  `completed_at` (all matches played/bye), `deadline_warning_sent`.
- `matches`: `player_a_id`, `player_b_id` (null = Bye), `status`, `scheduled_at`, `played_at`.
  `reminder_sent` is **unused** since the 1-hour reminder was removed (kept to avoid a migration).
- `proposals`: one row per suggested time; `status` open → accepted / declined / superseded.

Match status flow: `pending` → (proposal) `proposed` → (opponent accepts / admin sets time)
`confirmed` → (Lejátszottuk) `played`. `bye` never changes. A new proposal on a confirmed
match goes back to `proposed`. Admin "Visszaállítás" resets to `pending`.

Profiles link to players **by Karnyx name**, not by id, so one claim works across tournaments.

## 5. Domain rules (agreed with the owner, keep them)


- **Karnyx paste format:** each player is three `"<Hero> Avatar"` lines followed by the
  nickname; neighbours are opponents (1v2, 3v4…). Blank lines and lines without preceding
  avatars (buttons Karnyx shows to the copying admin) are ignored with a warning. Karnyx has
  **no public API**; tournament pages require login, so copy-paste is the only import.
- **Bye:** Karnyx leaves Bye players out of the copy. The admin types them in the Bye field;
  they become `bye` matches and appear on a `Pihen:` line in the round announcement. A Bye
  player who is also paired is rejected. An odd paste gives the last player a Bye.
- **Rounds:** max 1 week (default deadline = now + 7 days, editable). A round can finish
  early; starting the next round closes the previous one. The latest round can be deleted.
- **Proposals:** 1–3 times, in the future and **before the round deadline for everyone,
  admins included**. Only the admin "set time" tool may go past the deadline. A new proposal
  supersedes open ones.
- **Accepting:** only the side that did **not** propose can accept, even if they're an admin.
- **Played:** either player or an admin. Results still go into Karnyx.
- **Non-players** (organisers, admins, spectators) save their profile with "Nem játszom"
  and never claim a Karnyx name. Admin rights come from `is_admin` only.
- **"Egyedi" names:** a player not yet in any round picks "Egyedi név" and types their Karnyx
  name (cleaned, max 40 chars; roster spelling wins if it matches). They're linked to matches
  as soon as a pasted round or a swap uses the same name. Admins see an "egyedi" badge.
- **Player swap (admin, match page):** replaces one player of a non-played match in an open
  round. The new player may come from the roster, a registered Egyedi name or a new name
  (added to the roster without heroes). Their Bye in that round is deleted; they must not have
  a real match there. Optionally the dropout gets a Bye. Proposals and any agreed time are
  cleared (status back to `pending`), and Discord pings the new pairing. Rules live in
  `lib/swap.ts` (`planSwap`, unit-tested).
- **Making someone admin:** they log in once; an admin promotes them on the admin page by
  Discord or Karnyx name. Admins can't remove their own admin flag.
- **Admins fix Karnyx names:** "Karnyx név szerkesztése" on the admin user list opens
  `/meccsszervezo/admin/felhasznalo/[id]` with the same choices as the profile form. A name held by another
  user is refused with who holds it ("Név felszabadítása" there first).

## 6. Discord messages (all in `lib/notify.ts` and the cron route)


| Event | Pings |
|---|---|
| Round start: numbered pairs + `Pihen:` line | everyone registered |
| Time proposed: one short line + link | only the player(s) who must answer; skipped if they're not registered |
| Time confirmed | nobody (names in bold) |
| Admin player swap: who left, new pairing (+ `Pihen:` if the dropout got a Bye) | the new player and their opponent |
| Admin "Emlékeztető küldése" (asks for confirmation) | players with no proposal, and players who must answer one |
| 48 h before deadline (scheduled job) | players whose match has no agreed time |

Removed on purpose: the 1-hour-before reminder and the round-finished post. Unregistered
players appear as **bold names**; the webhook may only ping listed user IDs (no
@everyone/@here). Pings only notify members of that Discord server.

## 7. UI conventions

- Hungarian text everywhere users see it; dates via `formatDateTime` (`hu-HU`). In Hungarian
  only the first letter is capitalised (use `first-letter:uppercase`, not `capitalize`).
- Design: the site design system in `src/app/globals.css` (from `reference/artifact`). Colours
  are CSS variables (dark default, light via OS or the theme button). Button classes: `btn`
  (gold), `btn-secondary`, `btn-admin` (red), `btn-played` (big solid green), `btn-quiet`
  (grey helper), `btn-danger`, `btn-discord`, `btn-sm`. Status chips: `badge badge-<status>`.
  Layout pieces: `hero3` banner, `sec-h`/`hh` headings, `panel3`/`card`, `mr` match rows,
  `tile` picture tiles, `l3` main + sidebar grid.
- Links and redirects always go through `routes` (`src/lib/routes.ts`), never literal paths.
- Every server-action submit button is a `SubmitButton` (double-click protection is a requirement).
- Destructive or mass-ping actions ask for confirmation (`SubmitButton confirm=…`, or typing
  the tournament name to delete it).
- Add an `InfoTip` next to any non-obvious control, and update the GYIK page (`/meccsszervezo/gyik`) when behaviour changes.
- Mobile-first: players open links from the Facebook app on phones. Check 375 px width.

