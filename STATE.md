# Project state: DTHU website

**Current version: v2.0 (in development, not deployed).** Live: https://dthu.hu still runs
**v1.2** from the old repository github.com/Davetatyo/DT_Match_Organizer (commit `a278e0a`).
**Launch phase: 1**: the public sees only the Meccsszervező; the whole site from the prototype
is built and visible to **signed-in admins** as a developer preview. See "Launch plan".

Read [CLAUDE.md](CLAUDE.md) first for how the project works. This file is the running log:
where things stand, what's next, what each release changed, and the handover between agents.

---

## Rules for agents: keep this file current

Every time you **push a change to `main`** (which deploys to production once Vercel builds this
repository):

1. **Bump the version** in the "Current version" line above:
   - `v1.0 → v1.1 → v1.2 …` for features, fixes and UI changes.
   - `v2.0` (next major) only for big redesigns or changes that need a manual step from the
     owner (e.g. a database migration), and only after agreeing it with the owner.
   - Docs-only commits (this file, CLAUDE.md, docs/, README) do **not** bump the version; note
     them under the current version instead.
2. **Add a changelog entry** at the top of "Changelog" using the template below: version,
   date, commit hash, what changed (in plain words the owner understands), manual steps,
   how you verified it.
3. **Update "Status" and "Next steps"**: move finished items out, add new ideas or debts.
4. Commit this file together with the change (or right after it), so the log never lags behind
   what's deployed.

Entry template:

```markdown
### v1.X · YYYY-MM-DD · `<commit>`
**Changed:** what users or admins notice, one bullet each
**Manual steps:** none / e.g. "run supabase/migrations/0002_….sql before deploying"
**Verified:** tests/lint/types, browser checks (desktop + phone), live check after deploy
```

---

Also at the end of **every session** (shipped or not): add a Handover log entry and keep the
feature table, owner tasks and known issues current (see CLAUDE.md → "End of every session").

---

## Launch plan

**Phase 1: the Meccsszervező in public, the rest as an admin preview.** Every page of the
prototype is built (see Features). Anonymous visitors and non-admins are redirected to the
Meccsszervező; admins see the full menu with a "fejlesztői előnézet" strip, on dthu.hu too.
The code is on GitHub (github.com/Davetatyo/DTHU_Website, `main` + `feature/*`, pushed
2026-10-30); nothing is deployed from it yet. To go live:

1. ~~Push to github.com/Davetatyo/DTHU_Website~~ done 2026-10-30.
2. **Vercel: follow [docs/vercel.md](docs/vercel.md).** In short: import DTHU_Website as a
   *new* Vercel project (env vars copied, `DISCORD_WEBHOOK_URL` left out while testing), add its
   `*.vercel.app/auth/callback` to Supabase Redirect URLs, test login as admin and as a player
   on that address, then move the `dthu.hu` domain from the old project (`dthuonlinebajnoksag`)
   to the new one **between rounds** (round 1 deadline: 2026-11-02 12:25). Rollback = move the
   domain back.
3. Nothing changes in Supabase besides that redirect URL: `/auth/callback` and
   `/api/cron/reminders` keep their paths.
4. **Write tests use the real tournament** (one database): setting a match time changes that
   match; starting a new round closes round 1 and pings everyone. See docs/vercel.md §3 before
   testing writes.
5. Afterwards: record the release here, archive DT_Match_Organizer on GitHub (read-only).

**Phase 2: the full site.** When the features below have real data (owner decides which are
needed for launch): set `NEXT_PUBLIC_FULL_SITE=1` in Vercel and redeploy. Everyone then sees
the site menu, "Hírek" as the home page and `/gyik` as the site FAQ (in phase 1 the public is
sent to the Meccsszervező FAQ by a temporary redirect, on purpose). Decide before then whether login and profile move
to site-level URLs (they're under `/meccsszervezo` now) and add redirects if they do.

## Features

Status values match `src/features/registry.ts`. Design and sample content for every feature is
in `reference/artifact` (open `reference/artifact/index.html`).

| Feature (folder / branch `feature/<id>`) | Route | Status | Real data / still sample | Next step |
|---|---|---|---|---|
| `match-organizer` Meccsszervező | `/meccsszervezo` | **live** (v1.2 old design on dthu.hu; v2.0 ready) | all real | Launch plan |
| `landing-page` Hírek (home) | `/` | preview | banner + upcoming matches real; news sample | decide the news source (table + admin page?) |
| `rankings` Ranglista | `/ranglista` | preview | names/heroes real; points, records, movement sample | results source (Karnyx copy-paste? results on "Lejátszottuk"?) |
| `timetables` Versenynaptár | `/versenynaptar` | preview | confirmed matches real; events + season plan sample | events table, rounds from the Meccsszervező |
| `tickets` Jegyek | `/jegyek` | preview | balance sample (from sample ranking) | ticket ledger table + earning rules sign-off |
| `shop` Bolt | `/bolt` | preview | items sample; wishlist only in the browser | shared wishlist, then redeeming (needs tickets) |
| `rulebook` Szabálytár | `/szabalytar` | preview | content is final text from the prototype | credit/permission wording for Rulepop |
| `faq` GYIK (site-wide) | `/gyik` | preview | content from the prototype | review texts |
| `links` Linkek | `/linkek` | preview | real links | — |
| `alchemist` Alkimista | `/alkimista` + help vial | preview | knowledge base from the prototype; unanswered questions only in the browser | admin inbox for unanswered questions |

## Needs the owner

1. **Follow [docs/vercel.md](docs/vercel.md)**: new Vercel project for DTHU_Website, test on its
   address (admin + player login), then move dthu.hu over between rounds.
2. Carried over from DT_Match_Organizer `state.md` (2026-10-30), status unknown here, please
   confirm or close:
   - Domain move to dthu.hu: Supabase Site URL `https://dthu.hu` + redirect
     `https://dthu.hu/auth/callback`; `dt-reminders` job URL → `https://dthu.hu/api/cron/reminders`;
     Vercel `NEXT_PUBLIC_SITE_URL` (optional).
   - **Security:** `.env.local` still contains two lines without `NAME=` (they look like the
     Discord app's Client ID and Secret, which the app doesn't use; checked 2026-10-30, the
     values were not printed). Delete them and reset the Discord Client Secret (Developer
     Portal → OAuth2 → Reset Secret, then paste it into Supabase → Authentication → Providers →
     Discord).
   - Link RP to his match (Admin → RP's row → "Karnyx név szerkesztése" → "RP").
   - Confirm the first swap's 🔁 Discord post appeared; ask players to log in and claim their
     Karnyx names; around 2026-10-31 12:25 confirm the automatic 48h warning appeared.
   - Optional: tag releases (`v1.0 e527783`, `v1.1 6c1a193`, `v1.2 a278e0a`) and push tags.
3. Decide the scope and order of the phase-2 features (table above).

## Ideas discussed, not decided (ask the owner before building)

- Crop the logo to just the glowing dice for a clearer small icon, and use it as favicon.
- Drop the "Megerősítve" (confirmed) Discord posts entirely if the channel gets noisy.
- Split Discord posts into two channels (second webhook), or DMs via a real bot.
- Ask the Karnyx developers for a public share link or API to import pairings automatically.
- Hero-colour accents (the prototype's hidden "Válassz hőst" theme menu).
- More hero artwork: only Barbarian, Paladin and Alchemist have images
  (`public/images`, listed in `src/lib/heroes.ts`); others get a gradient in their colours.

## Known issues

- v2.0 is not yet tested end to end with a real login and write actions: locally only read-only
  checks and the TEMP-PREVIEW fake profile were used. Do the preview test (Launch plan step 2)
  before switching production.
- The admin preview gate (middleware reads `profiles.is_admin` with the visitor's session) is
  tested only for anonymous visitors so far; check it logged in as an admin and as a
  non-admin on the Vercel preview (Launch plan step 2).
- Most full-site pages show sample data (see Features); the prototype strip says so.
- Discord login works locally only on port 3000 (Supabase redirect allow-list).

## Technical debt

- `matches.reminder_sent` column is unused since v1.0 (1-hour reminder removed). Remove it
  in a future migration.
- No tests for server actions, database access or end-to-end flows; only pure logic is
  unit-tested. Consider Playwright against a separate Supabase project before bigger changes.
- Only one Supabase project: local development uses production data. A separate dev
  project would make testing write actions safe (and is needed before building features with
  their own tables).
- Login and profile live under `/meccsszervezo`; at the full launch they may belong to a
  site-level account area.
- The old class names in `globals.css` are aliased onto the new tokens (`--surface`,
  `--accent`, …); new code should use the design tokens (`--panel`, `--gold`, …) directly.

---

## Handover log

Newest first. Each session adds an entry (see CLAUDE.md → "End of every session").

### 2026-10-30 (evening) · non-admin view checked, Vercel prepared

- Owner asked: non-admins (logged in or not) must see only the Meccsszervező, no other tabs.
  Already the case; checked with the TEMP-PREVIEW profile (reverted): non-admin → one tab row
  (Áttekintés, Közelgő meccsek, GYIK), logo → `/meccsszervezo`, no preview strip; admin → site
  menu + Meccsszervező tabs + strip. Middleware redirects non-admins from every other page.
- `npm run build` passes; `next start` checks: `/`, `/bolt` → 307 `/meccsszervezo`; `/gyik` →
  307 `/meccsszervezo/gyik`; `/meccs/x`, `/menetrend` → 308; `/api/calendar` 200.
- `package.json` pins Node 22.x for Vercel. New guide **docs/vercel.md** (new project, env
  vars, Supabase redirect URL, test checklist with write-test warnings, domain switch, rollback).
- Gotcha: two `next dev` servers in this folder share `.next/` and serve random 404s; run one.

### 2026-10-30 (push) · everything on GitHub

Pushed `main` and all `feature/*` branches to github.com/Davetatyo/DTHU_Website (owner's
go-ahead; old DT_Match_Organizer repo and Vercel untouched). The first push of everything at
once got `Internal Server Error` from GitHub twice; pushing `main` in two steps
(`b7b9739`, then the rest) and then the feature branches worked. Locally the `organizer`
remote has its push URL disabled (`no-push-old-repo`) so nothing can go to the old repo.
Next: Launch plan step 2 (Vercel preview).

### 2026-10-30 (later) · the whole prototype site built as an admin preview

**Owner's direction:** build the whole website from the artifact, with the Meccsszervező under
its menu tab; only that tab is public, the rest stays hidden but usable by the owner.

**Done** (local commits on `main`; each feature committed on `feature/<id>` and merged with
`--no-ff`, so `git log --first-parent main` reads one line per feature):
- `567898b` site shell: admins see the full site in phase 1 (middleware checks
  `profiles.is_admin`), `DevPreviewBanner`, icon sprite, `Art` tiles, shared prototype styles,
  site routes; `/gyik` fallback moved from next.config into the middleware.
- Features: rankings, timetables, landing-page, tickets, shop, faq, links, rulebook,
  alchemist (see the Features table for what's real and what's sample). Content (rules,
  FAQ, Alchemist answers, sample news/shop/events) extracted unchanged from
  `reference/artifact`.
- Feature READMEs updated with "What's built".

**Verified:** 78 unit tests (new: Alchemist matcher and replies, rulebook search/index and rule
links, sample ranking, phase-1 fallback); types and lint; every first-parent commit on `main`
type-checks and passes tests on its own. Browser (dev server with `NEXT_PUBLIC_FULL_SITE=1`,
port 3101, production data read-only): every page renders; month calendar shows the real
confirmed matches; event dialog, rulebook tabs/search, rule pages with tables, Alchemist answer
with rule link, help vial popping up on the rulebook; phone width on the home page. Phase-1
server (port 3100), anonymous: `/`, `/bolt`, `/szabalytar/…` → 307 `/meccsszervezo`, `/gyik` →
307 `/meccsszervezo/gyik`.

**Not verified:** the admin preview while logged in (needs login on port 3000 or the Vercel
preview). **Next:** owner review → push → Vercel preview test (Launch plan).

### 2026-10-30 · v2.0 restructure and redesign (not pushed)

**Done** (local commits on `main` in `/Users/davetatyo/Documents/test/DTHU_Website`):
- New repository built on the full DT_Match_Organizer history (`main` = its `b7b9739` + v2.0
  commits). Remotes: `origin` = github.com/Davetatyo/DTHU_Website (empty, nothing pushed),
  `organizer` = github.com/Davetatyo/DT_Match_Organizer (read-only source).
- Restructure: Meccsszervező pages under `src/app/meccsszervezo/`, code in
  `src/features/match-organizer/`, route map `src/lib/routes.ts`, permanent redirects from the
  old URLs, phase-1 gate (`src/lib/site-mode.ts` + middleware), feature registry.
- Redesign in the prototype's look (globals.css design system, SiteHeader/NavTabs/ThemeToggle,
  hero banners, match rows grouped by day, hero tiles, round timeline, versus match page).
- Docs: CLAUDE.md, this file, docs/match-organizer.md (was handover.md), docs/setup.md (was
  README.md), feature READMEs and `src/features/_template/`.
- Branches `feature/<id>` created locally for every feature, from the v2.0 `main`.

**Verified:** 56 unit tests (new: schedule grouping, countdown, short date, phase-1 paths),
types, lint. Dev server (port 3100, production data, read-only): every page renders in dark
and light themes, desktop and 375 px; redirects: `/meccs/<id>`, `/menetrend`, `/admin/*`,
`/profil`, `/login` → 308 to `/meccsszervezo/…`; `/`, `/ranglista` → 307 to `/meccsszervezo`;
`/gyik` → 307 to `/meccsszervezo/gyik`; `/api/calendar` 200. Admin, profile and a player's
match page looked at with the TEMP-PREVIEW fake profile (reverted, nothing submitted).
Phase 2 checked on a second dev server with `NEXT_PUBLIC_FULL_SITE=1`: `/` shows the
placeholder home with the site menu, the Meccsszervező gets its tabs as a second row,
planned routes 404.

**Not done / next:** owner review → push → Vercel preview test with real login (Launch plan).
The local `.env.local` here holds only the Supabase keys and BOOTSTRAP_ADMIN_DISCORD (no
webhook, no cron secret), so nothing local can post to Discord.

---

## Changelog

### v2.0 · not deployed yet · commits `89237b9`, `9b4ad23`, `71f9cbf` + docs
Major version agreed with the owner (2026-10-30): the Meccsszervező becomes the first feature
of the DTHU website, in a new repository and a new design.
**Changed:**
- Address: the Meccsszervező moves from the site root to **`/meccsszervezo`**. Old links
  (`/meccs/<id>`, `/menetrend`, `/admin…`, `/profil`, `/login`) redirect permanently; `/gyik`
  and `/` redirect temporarily. Discord posts and calendar events link to the new addresses.
- New look from the website prototype: dark esports style (light theme via the moon/sun
  button), top menu with Áttekintés / Közelgő meccsek / GYIK / Admin felület tabs, round
  banner with countdown, matches as rows grouped by day (or hero-coloured cards), player
  avatars in their hero's colours, versus banner on the match page.
- Phase-1 gate: every page outside the Meccsszervező redirects to it until the full site opens.
**Manual steps:** connect Vercel to the new repository (see Launch plan). No database change.
**Verified:** see the Handover log entry of 2026-10-30.

### Ops · 2026-10-30
Owner moved the live site to **dthu.hu**; the Vercel domain now redirects there. No code change
needed (the app takes its address from the visited domain). Discord login failed afterwards
because Supabase's allowed redirect list didn't include dthu.hu. Docs (README, handover.md,
this file) now name dthu.hu and list the three settings a domain move needs. Still v1.2.

### v1.2 · 2026-10-28 · `a278e0a`
**Changed:**
- Admins can set or fix any user's Karnyx name: "Karnyx név szerkesztése" on the admin user
  list opens `/admin/felhasznalo/[id]` (roster name, Egyedi or Nem játszom). A name held by
  someone else is refused with who holds it. Made for cases like RP, who chose "Nem játszom".
- Time picker fix (owner-reported): changing the day after typing a time no longer leaves a
  stale date. Admin "Időpont beállítása" follows the visible day + time live (no
  "Kiválasztom" step); player suggestions send a typed-but-unadded time with the current day,
  shown as a dashed "küldéskor bekerül" chip. Each picker has its own time-field id.
- Home page: Kártyák/Lista switch (list default) with heroes on the cards and the viewer's own
  match outlined; the choice is remembered in a cookie. Admin page uses the same switch
  (cards default, remembered separately).
- GYIK, admin tip and handover.md updated.

**Manual steps:** none (no database change).
**Verified:** 46 unit tests (2 new for the view choice), lint, types. Browser: admin edit page
on RP's real profile (temporary fake admin, not saved); picker scenarios on a temporary page
(typed 19:30 then switched day → sends the new day; admin picker follows day changes live);
home page switch, remembered after reload, own match outlined (viewed as Dave). Live check
after deploy: view switch served, pages 200, admin edit page redirects anonymous visitors.

### v1.1 · 2026-10-28 · `6c1a193`
**Changed:**
- Admin player swap on the match page (Admin → "Játékos cseréje"): choose who drops out and
  the new player (suggestions: Bye players, roster players without a match, Egyedi
  registrations; or type any name). The new player's Bye in that round is removed; optional
  tick box gives the dropout a Bye. Scheduling restarts; Discord pings the new pairing.
  Rejected for played matches, Byes, closed rounds and players who already have a match.
- Profile: "Egyedi név (nincs a listában)" lets players register with a Karnyx name that
  isn't in the current round; a saved Egyedi name is preselected next time. Admin user list
  shows an "egyedi" badge.
- GYIK: answer about swaps; updated answer for players who can't find their name.
- handover.md: swap and Egyedi rules, and a warning never to `source .env.local`.

**Manual steps:** none (no database change).
**Verified:** 44 unit tests (8 new: swap rules, Egyedi names, swap message), lint, types.
Browser (as a temporary fake admin, nothing submitted): swap form and suggestions on a real
match, Egyedi option shows the text box, saved Egyedi name preselected. Swap writes not run
end to end (live database). Live check after deploy: new GYIK answer served, pages 200.

### Ops · 2026-10-26
Owner set up the hourly Supabase job (`dt-reminders`, `0 * * * *`) calling
`/api/cron/reminders`, with the cron secret stored in Supabase Vault as `dt_cron_secret`.
Verified with a manual request and the first hourly run (`200 {"warnings":0}`). README §6
now shows this Vault-based SQL. No app changes; still v1.0.

### Docs · 2026-10-26
Added `handover.md` (how the project works, conventions, gotchas) and this `state.md`
(status, next steps, version log). No app changes; still v1.0.

### v1.0 · 2026-10-26 · `e527783`
First release in use for the October 2026 tournament. Built in one session with the owner;
the pre-release history below shows how it got here.

**Features**
- Discord login; profile with Karnyx name (from the roster) or "Nem játszom" for
  organisers/spectators, Facebook name, time zone.
- Admin: create/delete tournament, paste a Karnyx round with live preview, Bye field,
  deadline (default 7 days, editable), delete latest round, matchup card grid or list,
  mark overdue matches played, send reminder, make/remove admins, free a claimed Karnyx name,
  Discord test message.
- Match page: action bar (big green Lejátszottuk, quiet copy-for-Facebook), players with
  heroes and (when logged in) Facebook/Discord names, propose 1–3 times with a day picker and
  typed time, opponent-only accept, calendar buttons, admin set time/reset.
- "Közelgő meccsek" page with calendar subscription (all matches or one player).
- Discord posts: round start (pings + Pihen line), short ping on proposals, unpinged
  confirmations, manual reminder, 48h deadline warning endpoint.
- GYIK page and delayed "?" help tips; busy overlay on every server action; DTHUN logo header.

**Manual steps:** schema from `supabase/migrations/0001_init.sql` (done); scheduled job
still to set up (see Next steps).
**Verified:** 36 unit tests, lint, types, browser checks on desktop and phone, live checks
after each deploy.

### Pre-release history (all 2026-10-26)

| Version | Commit | Change |
|---|---|---|
| v0.1 | `c85b589` | MVP: parser, schema, Discord login, match scheduling, schedule, calendars, admin, webhook |
| v0.2 | `230c1df` | Feedback round: day picker, deadline limit, opponent-only accept, honest notify text, card grid, reminder button, delete tournament, "Bye" naming |
| v0.3 | `89b6e21` | Site address taken from the visited domain (fixed live login redirect) |
| v0.4 | `b8f67af` | Submit buttons lock with hourglass + blurred busy overlay |
| v0.5 | `415b189` | Bye field in round creation, "Pihen:" line in the announcement |
| v0.6 | `a31f9fb` | Header redesign (profile + Kilépés top right, red Admin felület) |
| v0.7 | `95dde2c` | Discord posts trimmed (short proposal ping, unpinged confirmations, no 1h/round-finished posts) |
| v0.8 | `e598378` | DTHUN logo, Főoldal button, Menetrend renamed to Közelgő meccsek |
| v0.9 | `173b3ec` | Green/blue header buttons, match action bar moved to the top |
| v0.10 | `ca83c41` | GYIK page and delayed "?" help tips |
| v1.0 | `e527783` | Organisers/spectators without a Karnyx name |
