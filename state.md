# Project state: DTHUN Meccsszervező

**Current version: v1.1**, live at https://dthuonlinebajnoksag.vercel.app
(commit `6c1a193` on `main`, 2026-10-28)

Read [handover.md](handover.md) first for how the project works. This file is the running log:
where things stand, what's next, and what each release changed.

---

## Rules for agents: keep this file current

Every time you **push a change to `main`** (which deploys to production):

1. **Bump the version** in the "Current version" line above:
   - `v1.0 → v1.1 → v1.2 …` for features, fixes and UI changes.
   - `v2.0` (next major) only for big redesigns or changes that need a manual step from the
     owner (e.g. a database migration), and only after agreeing it with the owner.
   - Docs-only commits (this file, `handover.md`, README) do **not** bump the version; note
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

## Status (as of 2026-10-28)

- **Live and in use.** Active tournament: *DTHU - Október - Online Bajnokság 2026*.
  Round 1 started 2026-10-26, deadline **2026-11-02 12:25** (Budapest); 11 matches
  (8 confirmed, 1 played, 2 pending).
- **Registrations:** 3 profiles (2 with a Karnyx name, 2 admins). Most players still need to
  log in and claim their Karnyx names before Discord pings reach them.
- Discord webhook is configured and tested; Discord login works on the live domain.
- Scheduled job `dt-reminders` runs hourly in Supabase (pg_cron + pg_net, secret in Vault as
  `dt_cron_secret`); verified 2026-10-26 with `200 {"warnings":0}`. Round 1's 48h warning
  is due from about 2026-10-31 12:25.
- Automated tests: 44 unit tests passing; lint and type check clean.

## Next steps

### Needs the owner
1. **Security:** `.env.local` had two lines without `NAME=` (they looked like the Discord app's
   Client ID and Client Secret, which the app doesn't use). On 2026-10-28 an agent's shell
   command printed them in its session log. Delete or comment out those lines, and reset the
   Discord Client Secret (Developer Portal → OAuth2 → Reset Secret, then paste it into
   Supabase → Authentication → Providers → Discord).
2. **First real player swap:** the v1.1 swap's database writes have only been checked through
   unit-tested rules, not run end to end (that would have changed live data). Watch the first real
   swap: the match shows the new player with "Nincs időpont", a Bye was removed or added as
   chosen, and Discord got the 🔁 post.
3. Ask players in the Facebook group to log in once and pick their Karnyx name (or "Egyedi").
4. Optional: tag releases in git (`git tag v1.0 e527783`, `git tag v1.1 6c1a193`, then
   `git push origin --tags`) and tag future versions the same way.
5. Around 2026-10-31 12:25, confirm the first automatic 48h warning appeared on Discord
   (or check `net._http_response` for `{"warnings":1}`).

### Ideas discussed, not decided (ask the owner before building)
- Crop the logo to just the glowing dice for a clearer small icon, and use it as favicon.
- Phone header: shorten "Admin felület" to "Admin" so it fits on the second row.
- Drop the "Megerősítve" (confirmed) Discord posts entirely if the channel gets noisy.
- Split Discord posts into two channels (second webhook), or DMs via a real bot.
- Ask the Karnyx developers for a public share link or API to import pairings automatically.

### Technical debt
- `matches.reminder_sent` column is unused since v1.0 (1-hour reminder removed). Remove it
  in a future migration.
- No tests for server actions, database access or end-to-end flows; only pure logic is
  unit-tested. Consider Playwright against a separate Supabase project before bigger changes.
- Only one Supabase project: local development uses production data. A separate dev
  project would make testing write actions safe.
- README and `handover.md` overlap on setup; keep both accurate or trim README to a pointer.

## Known issues

None open.

---

## Changelog

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
