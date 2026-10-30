# Moving dthu.hu to the new repository (Vercel)

Goal: build dthu.hu from **github.com/Davetatyo/DTHU_Website** (`main`) instead of
DT_Match_Organizer, without downtime and with an instant way back.

**Approach: a new Vercel project.** It gets its own `*.vercel.app` address where everything can
be tested while dthu.hu keeps serving the old app. When the test passes, the `dthu.hu` domain
moves from the old project to the new one. Rollback = move the domain back (seconds).

Nothing in the code needs changing for this. Supabase and the reminder job keep their URLs
(`/auth/callback`, `/api/cron/reminders`), so they only need the small steps below.

---

## 1. Create the new Vercel project

1. Vercel → **Add New… → Project** → Import Git Repository → `Davetatyo/DTHU_Website`
   (if it isn't listed: "Adjust GitHub App Permissions" and give Vercel access to the repo).
2. Settings Vercel detects (leave them): Framework **Next.js**, Root Directory `./`, Build
   Command `npm run build`, Install Command default, Output default. Node.js **22.x** comes from
   `package.json` → `engines`.
3. **Environment Variables** (copy the values from the old project `dthuonlinebajnoksag` →
   Settings → Environment Variables; names only here):

   | Name | Production | Preview | Note |
   |---|---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | |
   | `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | secret |
   | `BOOTSTRAP_ADMIN_DISCORD` | ✓ | ✓ | `davetatyo` |
   | `CRON_SECRET` | ✓ | — | same value as the old project (the Supabase job sends it) |
   | `DISCORD_WEBHOOK_URL` | see below | — | leave it out of Preview so test deployments never post |
   | `NEXT_PUBLIC_SITE_URL` | optional | — | `https://dthu.hu` (fallback only) |
   | `NEXT_PUBLIC_FULL_SITE` | **leave unset** | — | unset = phase 1: public sees only the Meccsszervező |

   **Discord during the test:** the first production deployment of the new project is only
   reachable on its `*.vercel.app` address, but it writes to the real database. To test
   *without* Discord posts, leave `DISCORD_WEBHOOK_URL` out at first, and add it (then
   Redeploy) right before moving the domain (section 4). Admin page then shows "Webhook: nincs
   beállítva" until you add it.
4. **Deploy.** Note the project's address, e.g. `https://dthu-website.vercel.app`.

## 2. Let Discord login work on the new address (Supabase)

Supabase → Authentication → **URL Configuration** → Redirect URLs → add:

- `https://<new-project>.vercel.app/auth/callback`
- optional, for branch previews: `https://*-<your-vercel-team-slug>.vercel.app/**`

Keep the **Site URL** `https://dthu.hu` and keep the existing dthu.hu and localhost entries.
(Without the new entry, Supabase silently sends the login back to dthu.hu and it never finishes.)

## 3. Test on the new address

Read-only (safe any time):

- [ ] `/` redirects to `/meccsszervezo`; the Áttekintés page shows round 1 and the matches.
- [ ] `/meccs/<id>` (an old link from Discord) redirects to `/meccsszervezo/meccs/<id>`.
- [ ] `/api/calendar` downloads the .ics feed.
- [ ] **Login with Discord** works and lands on the Meccsszervező (or on the profile page if the
      profile isn't finished).
- [ ] As **admin**: the full site menu + the "fejlesztői előnézet" strip appear; Hírek, Ranglista,
      Szabálytár … open. The Admin felület shows the tournament, round, users.
- [ ] As a **non-admin** (ask a player, or another Discord account): only Áttekintés,
      Közelgő meccsek, GYIK; `/`, `/bolt`, `/szabalytar` all go back to the Meccsszervező.
- [ ] Phone: the same pages on a phone (Facebook in-app browser if possible).

Writes (they change the **real tournament**, read this first):

- There is **one database**. Anything you do on the new address happens on dthu.hu too.
- **Setting a match time** (admin "Időpont beállítása", or propose + accept): changes that
  match for real. Use a match where the players already agreed on a time, and set the same
  time, or one you've agreed with them. With `DISCORD_WEBHOOK_URL` unset, nothing is posted.
- **Starting a new round** closes round 1 for everyone, imports new pairings and (with the
  webhook set) pings every player. **Don't do this as a test** while round 1 is running
  (deadline 2026-11-02 12:25). Do it for real when round 2 is due, ideally on the new site
  after the domain switch.
- **"Lejátszottuk", reminders, player swap, deleting rounds**: real actions too; only when the
  real situation calls for them.
- For free experimenting with writes, a second Supabase project is the safe way (see
  STATE.md → Technical debt): run `supabase/migrations/0001_init.sql` in it and point a Vercel
  Preview environment at it.

## 4. Switch the domain (between rounds)

1. Add `DISCORD_WEBHOOK_URL` to the new project (Production) and **Redeploy**.
2. Old project `dthuonlinebajnoksag` → Settings → Domains → remove `dthu.hu` (and `www.dthu.hu`
   if listed). Keep its `*.vercel.app` domain: the redirect from the old address is set there.
3. New project → Settings → Domains → add `dthu.hu` (and `www.dthu.hu` → redirect to `dthu.hu`).
   DNS already points at Vercel, so it switches within a minute.
4. Check right after:
   - [ ] https://dthu.hu → Meccsszervező, new design; login works.
   - [ ] Old address https://dthuonlinebajnoksag.vercel.app still redirects to dthu.hu (it is
         handled by the old project; if not, add a redirect domain in the new project).
   - [ ] Next full hour: Supabase SQL `select status_code, content from net._http_response order
         by created desc limit 3;` shows `200 {"warnings":0}` (the reminder job reached the new app).
5. Disconnect the old project from Git (Settings → Git) so a push to DT_Match_Organizer can't
   take the domain back by accident, or delete it after a week of quiet running.

**Rollback:** move `dthu.hu` back to the old project (step 2–3 in reverse). Nothing in the
database depends on which app serves the domain.

## 5. After the switch

- Every push to `main` of DTHU_Website deploys dthu.hu. Feature branches get Preview URLs.
- Record the release in STATE.md (version, changelog, Handover log), then archive
  DT_Match_Organizer on GitHub (Settings → Archive).
