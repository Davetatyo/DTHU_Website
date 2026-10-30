# DTHU website: instructions for coding agents

The community website of Dice Throne Hungary (DTHU). It grows feature by feature around the
**Meccsszervező** (match organizer), which is live at https://dthu.hu and used by players
every day. The UI is **Hungarian**; code, comments, commit messages and these docs are English.

**Owner:** Dave (Discord `davetatyo`, Karnyx name `Dave`), tournament organiser and main admin.
He reviews in small iterations, in English, and decides what ships.

## Start of every session (takeover)

1. Read [STATE.md](STATE.md) top to bottom: version, launch phase, what each feature's status
   is, open owner tasks, known issues, and the **Handover log** (the last session's notes).
2. Check the branch and working tree: `git status`, `git log --oneline -5`. Work on the
   feature branch for what you're asked to do (see "Branches" below), never directly on `main`
   unless it's an agreed fix.
3. If you touch the Meccsszervező, read [docs/match-organizer.md](docs/match-organizer.md)
   (domain rules agreed with the owner). For services and env setup: [docs/setup.md](docs/setup.md).
4. Run `npm test`, `npx tsc --noEmit`, `npm run lint` once to know the baseline.

## End of every session (handover)

Before you stop, even if the work is unfinished:

1. Update [STATE.md](STATE.md): the feature table, "Needs the owner", "Known issues",
   "Technical debt", and add a dated entry at the top of the **Handover log**: what you did,
   what's half-done (branch + files), what you verified and how, what the next agent should do
   first. Write it so someone with no memory of this session can continue.
2. If you shipped to production: bump the version and add a changelog entry (rules in STATE.md).
3. Commit your work on its branch (only when the owner agreed to commits) with STATE.md in the
   same or the following commit. Never leave the owner's database or Discord in a state you
   didn't report.

## Golden rules

1. **One shared production database.** Local development uses the live Supabase project with
   real tournament data. Never trigger write actions (start round, propose, accept, played,
   delete, reminders, profile save) while testing unless the owner asked you to. Reading is fine.
2. **Commit and push only when the owner says so.** Once Vercel builds this repository, a
   push to `main` deploys to dthu.hu within a minute.
3. **No secrets in the repository**, docs, commits or chat. Keys, the Discord webhook and the
   cron secret live in `.env.local`, Vercel and the Supabase/Discord dashboards. Never
   `source .env.local` (non `NAME=value` lines would execute and print their values).
4. **Old links must keep working.** Players have match links in Discord, bookmarks and
   subscribed calendars. Paths come from `src/lib/routes.ts`; when one changes, add a redirect
   in `next.config.ts`. `/auth/*` and `/api/*` never move (Supabase and calendars call them),
   and calendar event UIDs (`lib/calendar.ts`) must never change.
5. **Plan or ask first for anything non-trivial**, and show screenshots (desktop + 375 px
   phone, dark + light) before committing visual changes.

## Stack and commands

Next.js 15.5 (App Router, Server Components, Server Actions), React 19, TypeScript,
Tailwind 4 + the design system in `src/app/globals.css`, Supabase (`@supabase/ssr`), Vitest,
Node 22, Vercel. Next 15: page `params`/`searchParams` are Promises; `"use server"` files may
only export async functions. Don't upgrade to Next 16 casually (middleware → proxy rename).

```bash
npm run dev          # http://localhost:3000 (the only local port Discord login accepts)
npm test             # unit tests (vitest)
npx tsc --noEmit     # types
npm run lint
npm run build        # stop the dev server first, both use .next/
```

`.env.local` (names in `.env.example`) is only read at dev-server start. `NEXT_PUBLIC_*`
values are baked in at build time: change them in Vercel, then redeploy.

## Project map

```
src/app/                     routes only: thin pages that load data and render feature components
  layout.tsx                 <html>, fonts, early theme script
  (site)/                    the full website shell + pages (hidden in phase 1, see site-mode)
  meccsszervezo/             the Meccsszervező sub site (live)
  auth/, api/                login callbacks, calendar feed, cron endpoint (site-wide, fixed URLs)
src/features/<id>/           ONE FOLDER PER FEATURE: its lib/, components/, actions/, tests, README
  registry.ts                every feature: id, menu label, route, status (drives the site menu)
  _template/                 how a feature folder is laid out; copy it to start a new one
src/components/              shared UI: SubmitButton, InfoTip, CopyButton, HeroAvatar, icons,
  site/                      SiteHeader, NavTabs, ThemeToggle, SiteFooter
src/lib/                     site-wide: auth, routes, site-mode, navigation, heroes, site URL,
                             supabase clients, shared types
src/middleware.ts            phase-1 gate + Supabase session refresh
supabase/migrations/         schema, applied by the owner in the Supabase SQL editor
reference/artifact/          the design prototype (not built): source for the look and for
                             the content of features still to build
docs/                        match-organizer.md (feature guide), setup.md (services, env, cron)
```

**Dependency direction:** `app/` → `features/` → `components/`, `lib/`. A feature may use
another feature only through what that feature exports from its `components/` or `lib/`;
`lib/` and `components/` never import from `features/` (except `lib/navigation.ts` reading the
registry).

## Features and branches

- Every feature has an `id` (kebab-case), a folder `src/features/<id>/`, an entry in
  `src/features/registry.ts`, a branch `feature/<id>`, and a row in STATE.md.
- Branches: `main` is production. Build a feature on `feature/<id>` (branched from `main`,
  merge `main` into it regularly). Small fixes to live code: `fix/<short-name>` from `main`.
  Merge into `main` only with the owner's OK (a pull request on GitHub is the norm).
- A feature can be merged before it's public: in phase 1 the gate shows every page outside
  `/meccsszervezo` to admins only. Status `planned` keeps it out of the menu, `preview` shows
  it to admins, `live` means the public uses it.
- Starting a feature: copy `src/features/_template/`, fill its README (scope, route, data,
  open questions), add the registry entry and route constant, build pages under
  `src/app/(site)/<route>/`. The prototype's version of the feature is in `reference/artifact`.
- Database changes: a new numbered file in `supabase/migrations/`; the owner runs it manually
  *before* the code that needs it is deployed. Record it as a manual step in STATE.md.

## Launch phases

`src/lib/site-mode.ts`. **Phase 1** (now): the public sees only `/meccsszervezo` (plus `/auth`,
`/api`), whose tabs are its main menu; every other page redirects there. **Signed-in admins**
see the whole site as a developer preview: site menu on top, Meccsszervező tabs as a second
row, a "fejlesztői előnézet" strip (middleware checks `profiles.is_admin`). **Phase 2**:
`NEXT_PUBLIC_FULL_SITE=1` in Vercel + redeploy opens the full site to everyone. Locally, set
the flag in `.env.local` to see the hidden pages without logging in.

## UI conventions

- Hungarian text for users; in Hungarian only the first letter is capitalised (use
  `first-letter:uppercase`, not `capitalize`). Dates via the helpers in
  `features/match-organizer/lib/time.ts` (`hu-HU`, the viewer's time zone).
- Use the design system classes (see the comments in `globals.css`) and its CSS variables;
  check dark and light themes. The top bar stays dark in both.
- Every server-action submit is a `SubmitButton` (double-click protection); destructive or
  mass-ping actions ask for confirmation. Add an `InfoTip` to non-obvious controls.
- Mobile-first: players open links from the Facebook app on phones. Check 375 px width.

## Verifying changes

- `npx tsc --noEmit`, `npm run lint`, `npm test` before every commit. Put logic in pure
  functions in a feature's `lib/` and unit-test it next to the file (`*.test.ts`).
- Browser checks: start the dev server from a shell (`npx next dev -p <port>`); the desktop
  app's preview launcher can't start it in this folder. Login only works on port 3000.
- **Logged-in pages without logging in:** temporarily make `getCurrentProfile()` in
  `src/lib/auth.ts` return a fake profile when there's no user, marked `// TEMP-PREVIEW`. Look
  only (real database!), revert immediately, and check `grep -rn TEMP-PREVIEW src` prints
  nothing before any commit.
- Never test the Discord webhook by posting yourself; the owner uses the admin "Teszt üzenet
  küldése" button.
- After a deploy, check the live site picked up the change, then tell the owner.

## Gotchas

- Supabase only accepts login redirects listed in its URL Configuration; add every new domain
  (and keep `http://localhost:3000/auth/callback`).
- Vercel Hobby cron runs once a day, so reminders use Supabase `pg_cron` (docs/setup.md §6).
- Discord messages over 2000 characters are split by `chunkLines`; keep lines short.
- Karnyx has no public API and needs a login: pairings are imported by copy-paste only.
