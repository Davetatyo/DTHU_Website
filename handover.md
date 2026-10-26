# Handover: DTHUN Meccsszervező

Read this file and [state.md](state.md) before changing anything. This file explains how the
project works and how to work on it. `state.md` says where things stand right now, what's
next, and is where you **record every change you ship** (with the version number).

> **No secrets in this repository.** API keys, the Discord webhook URL and the cron secret
> live only in `.env.local` (shared with you securely by the owner), in Vercel's
> environment variables, and in the Supabase / Discord dashboards. Never paste their values
> into code, commits, docs, issues or chat logs.

---

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

## 2. Environments and services

| What | Where | Notes |
|---|---|---|
| Live site | https://dthuonlinebajnoksag.vercel.app | Vercel project `dthuonlinebajnoksag` |
| Code | https://github.com/Davetatyo/DT_Match_Organizer | branch `main` |
| Hosting | Vercel (Hobby) | **Every push to `main` deploys to production automatically** (~30–70 s) |
| Database + login | Supabase (Postgres, Auth with Discord provider) | project URL is in `.env.local` |
| Discord login app | Discord Developer Portal | redirect is the Supabase `/auth/v1/callback` URL |
| Announcements | Discord channel webhook "DT Meccsszervező" | URL in `.env.local` / Vercel |
| Scheduled job | Supabase `pg_cron` job `dt-reminders` (hourly) + `pg_net` calling `/api/cron/reminders` | secret stored in Supabase Vault as `dt_cron_secret`; checks in README §6 |

⚠️ **There is only one database.** Local development (`npm run dev`) talks to the same
Supabase project as the live site, with real tournament data. Never click buttons that write
(start round, propose, accept, played, delete, send reminder) while testing locally unless
the owner explicitly asked you to. Read-only browsing is fine.

### Environment variables (names only)

Defined in `.env.local` locally and in Vercel → Settings → Environment Variables:

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key (public, used for auth cookies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Server-only key that bypasses RLS; all writes use it |
| `NEXT_PUBLIC_SITE_URL` | Optional fallback only; the app derives its URL from the request host |
| `BOOTSTRAP_ADMIN_DISCORD` | Comma-separated Discord usernames that become admin on first login |
| `DISCORD_WEBHOOK_URL` | **Secret.** Channel webhook for all bot posts |
| `CRON_SECRET` | **Secret.** Bearer token the scheduled job must send |

`NEXT_PUBLIC_*` values are baked in at **build** time: after changing one in Vercel you must
redeploy. `.env.local` is only read when the dev server starts: restart it after edits.

## 3. Tech stack

- **Next.js 15.5** (App Router, Server Components, Server Actions), **React 19**, TypeScript
- **Tailwind CSS 4** plus a few component classes and colour tokens in `src/app/globals.css`
- **Supabase** via `@supabase/ssr` (cookie session) and `@supabase/supabase-js` (service client)
- **Vitest** for unit tests
- Node 22, npm

Next 15 specifics used everywhere: page `params` and `searchParams` are **Promises**
(`const { id } = await params`), and `"use server"` files may only export async functions.
Don't upgrade to Next 16 casually (middleware → proxy rename and other breaking changes).

## 4. Running it locally

```bash
npm install
# put the .env.local you received in the project root
npm run dev          # http://localhost:3000
npm test             # unit tests (vitest)
npm run lint
npx tsc --noEmit     # type check
npm run build        # production build (stop the dev server first, both use .next/)
```

Discord login works on localhost because `http://localhost:3000/auth/callback` is in
Supabase's allowed redirect URLs.

## 5. Architecture

### Request and data flow

- **Reads** happen in Server Components through helpers in `src/lib/data.ts`, using the
  **service client**. Pages decide what to show: Facebook/Discord names only render for
  signed-in visitors.
- **Writes** happen only in **Server Actions** (`actions.ts` next to each page). Every
  action first checks permission (`requireProfile` / `requireAdmin` in `src/lib/auth.ts`, plus
  "is this my match?" via `isParticipant`), then writes with the service client.
- **RLS** (see the migration) allows public `select` on tournament tables and authenticated
  `select` on `profiles`; there are no write policies. That protects the REST API, since the
  anon key is public.
- The browser never talks to the database directly.

### Auth

1. `/login` server action → `supabase.auth.signInWithOAuth({ provider: "discord" })`.
2. Discord → Supabase → `/auth/callback` (`src/app/auth/callback/route.ts`): exchanges the
   code, upserts `profiles` (Discord id, username, display name), applies
   `BOOTSTRAP_ADMIN_DISCORD`, then redirects to `/profil` if the profile isn't finished, else `/`.
3. `src/middleware.ts` refreshes the session cookie on every page request.
4. A profile is "finished" once saved, i.e. `facebook_name` is set (`isProfileComplete` in
   `src/lib/profile.ts`). Players also have a `karnyx_name`; organisers and spectators choose
   "Nem játszom" and keep it `null`.

### Site URL

`getSiteUrl()` (`src/lib/site.ts`) builds the public URL from `x-forwarded-host`/`host`, so
login redirects, Discord links and calendar links are correct on any domain.
`NEXT_PUBLIC_SITE_URL` is only a fallback. A new custom domain only needs adding in Vercel
and in Supabase → Authentication → URL Configuration (Site URL + `…/auth/callback`).

## 6. Code map

```
src/app/
  layout.tsx            header (logo, Főoldal, Közelgő meccsek, Admin felület, GYIK, profile, Kilépés), footer
  page.tsx              home: "Következő meccsem" card + current round list
  login/page.tsx        Discord login
  auth/callback|signout route handlers
  profil/               profile form (Karnyx name or "Nem játszom", Facebook name, time zone)
  meccs/[id]/           match page: action bar (Lejátszottuk, copy message), players,
                        proposals, SlotPicker proposal form, admin tools
  menetrend/page.tsx    "Közelgő meccsek": confirmed upcoming matches + calendar subscribe
  gyik/page.tsx         FAQ (keep it in sync with behaviour!)
  admin/                admin page, ImportForm (Karnyx paste + Bye field + preview), actions
  api/calendar          .ics feed (all / ?player= / ?match=)
  api/cron/reminders    48h-before-deadline Discord warning (Bearer CRON_SECRET)
src/components/
  SubmitButton          use for EVERY server-action submit: disables + hourglass + blurred overlay; `confirm` prop
  InfoTip               "?" help bubble: opens after 200 ms hover, tap toggles, keyboard focus opens
  SlotPicker            day cards + typed time entry, up to N slots, posts hidden "slot" inputs
  MatchupGrid, MatchList, StatusBadge, CopyButton, icons
src/lib/
  karnyx.ts             parser for pasted Karnyx text + Bye names (pure, tested)
  notify.ts             all Discord message texts (pure builders tested) + senders
  discord.ts            webhook posting, mentions, 2000-char chunking
  data.ts               read helpers;  rounds.ts  played/round-complete logic
  time.ts               time zone conversion without libraries, Hungarian formatting, picker days
  ics.ts, calendar.ts   iCalendar + Google Calendar links
  profile.ts            NOT_PLAYING, isProfileComplete, resolveKarnyxChoice
  auth.ts, site.ts, labels.ts, types.ts, supabase/server.ts
supabase/migrations/0001_init.sql   full schema + RLS (applied manually in the SQL editor)
public/dthun-logo.jpg               header logo (320×180)
```

## 7. Data model

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

## 8. Domain rules (agreed with the owner, keep them)

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
- **Making someone admin:** they log in once; an admin promotes them on the admin page by
  Discord or Karnyx name. Admins can't remove their own admin flag.

## 9. Discord messages (all in `src/lib/notify.ts` and the cron route)

| Event | Pings |
|---|---|
| Round start: numbered pairs + `Pihen:` line | everyone registered |
| Time proposed: one short line + link | only the player(s) who must answer; skipped if they're not registered |
| Time confirmed | nobody (names in bold) |
| Admin "Emlékeztető küldése" (asks for confirmation) | players with no proposal, and players who must answer one |
| 48 h before deadline (scheduled job) | players whose match has no agreed time |

Removed on purpose: the 1-hour-before reminder and the round-finished post. Unregistered
players appear as **bold names**; the webhook may only ping listed user IDs (no
@everyone/@here). Pings only notify members of that Discord server.

## 10. UI conventions

- Hungarian text everywhere users see it; dates via `formatDateTime` (`hu-HU`). In Hungarian
  only the first letter is capitalised (use `first-letter:uppercase`, not `capitalize`).
- Colours come from CSS variables in `globals.css` (light + dark). Button classes: `btn`,
  `btn-secondary`, `btn-green` (Főoldal), `btn-blue` (Közelgő meccsek), `btn-admin` (red),
  `btn-played` (big solid green), `btn-quiet` (grey helper), `btn-danger`, `btn-discord`, `btn-sm`.
- Every server-action submit button is a `SubmitButton` (double-click protection is a requirement).
- Destructive or mass-ping actions ask for confirmation (`SubmitButton confirm=…`, or typing
  the tournament name to delete it).
- Add an `InfoTip` next to any non-obvious control, and update `/gyik` when behaviour changes.
- Mobile-first: players open links from the Facebook app on phones. Check 375 px width.

## 11. How to work on it (the owner's preferences)

1. **Plan or ask first for anything non-trivial.** The owner reviews and gives feedback in
   small iterations, in English, about a Hungarian UI.
2. **Show before shipping:** for visual changes, show screenshots (desktop + phone) before
   committing.
3. **Commit and push only when the owner says so.** Pushing deploys to production immediately.
4. After pushing, **verify the live site** picked up the change (poll a page for the new text
   or the build id), then tell the owner.
5. **Record the release in `state.md`**: bump the version, add a changelog entry, update
   "Next steps" (see the rules at the top of `state.md`).

### Verifying changes

- Always run `npx tsc --noEmit`, `npm run lint` and `npm test` before committing. Add unit tests
  for pure logic (parsers, message builders, time, profile rules); keep logic out of
  components where possible so it stays testable.
- Browser checks: start the dev server from a shell (`npm run dev`). On this Mac the
  preview launcher can't read the Documents folder.
- **Logged-in pages without logging in:** temporarily make `getCurrentProfile()` in
  `src/lib/auth.ts` return a fake profile when there's no user, marked with a
  `// TEMP-PREVIEW` comment. Look only, don't click write actions (real database!), revert
  immediately, and check with `grep -rn TEMP-PREVIEW src` (must print nothing) before any commit.
- Never test the Discord webhook by posting yourself; the owner uses the admin "Teszt üzenet
  küldése" button. A `GET` on the webhook URL is read-only and safe for checking it exists.

## 12. Gotchas

- One shared database for local and live (see §2).
- `NEXT_PUBLIC_*` env values need a redeploy; `.env.local` needs a dev server restart.
- Supabase only accepts login redirects listed in its URL Configuration; add every new domain.
- Vercel Hobby cron only runs once a day, which is why reminders use Supabase `pg_cron`.
- Discord messages over 2000 characters are split by `chunkLines`; keep message lines short.
- The Karnyx site needs a login, so don't build scrapers around it.
- Schema changes need a new numbered file in `supabase/migrations/`, which the owner
  runs manually in the Supabase SQL editor *before* the code that needs it is pushed.
  Note this in `state.md` as a manual step.
