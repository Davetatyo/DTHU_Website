# Features roadmap: DTHU website

Features the owner wants built **in the future**. This is a living list: items get added,
reshaped, built or dropped as the site grows. It is the owner's wish list, not a commitment.

- **[STATE.md](STATE.md)** says where things stand now: what's built, live and broken.
- **This file** says what could come next and what each item is meant to do.

## How agents use this file

**At the start of a session** (after STATE.md, see CLAUDE.md → "Start of every session"):

1. Read the list below and note the items marked **Ready to plan**, or whose "Depends on"
   items are now built. These are the possible pickup points.
2. Don't start building on your own. Suggest a pickup point to the owner, with a short plan:
   scope, database changes, screens, and the open questions to answer first. Build only after
   the owner agrees, on `feature/<id>` (see CLAUDE.md → "Features and branches").

**While working and at the end of a session:**

- Update the item's **Status**. Add what was decided under "Decisions" and remove answered
  "Open questions".
- When an item is built, move it to "Built" at the bottom with the version and date. It also
  gets its row in STATE.md → Features.
- When the owner drops an item, move it to "Dropped" with one line on why. Don't delete it, so
  nobody suggests it again.
- When the owner mentions a new idea, add it here as **Idea**, using the template at the end.

**Status values:**

| Status | Meaning |
|---|---|
| Idea | Written down. Scope not agreed yet. |
| Ready to plan | The owner wants it. The next step is a plan to discuss with them. |
| Planned | Plan agreed. Branch, migration and screens are known. |
| In progress | Being built on its branch (named in the item). |
| Built | Moved to "Built" below. |
| Dropped | Moved to "Dropped" below. |

---

## Shared foundations

Several items below need the same building blocks. Build each one once, as the first step of
whichever item needs it first.

| Foundation | Needed by | Notes |
|---|---|---|
| **Admin area**: a dedicated admin page with its own menu | R2, R4, R5 | That page is item R5. Every admin tool below plugs into its menu. |
| **Image upload**: Supabase Storage bucket, resize and compress before saving | R2, R3 | One shared helper: resize to a max size and compress, keeping quality reasonable (e.g. WebP), on the client before upload. Size limits and allowed types are enforced by the bucket policy. |
| **Separate dev Supabase project** | all items with new tables | STATE.md → Technical debt. Local development uses the live database today. New tables and uploads should be tried on a dev project first. |
| **Activity events**: one place where "something happened" is recorded | R4, later tickets/shop | XP (and later tickets) are awarded from events such as a played match, a sign-up or a finished tutorial. Design this together with the XP system. |

Suggested order, based on what depends on what (the owner decides the real order):
**R5 Admin area → R2 News & events → R3 Profile → R4 XP → R1 Tutorial.**
The tutorial goes last because it walks users through the other features and awards XP.

---

## Items

### R1 · Site tutorial (Útmutató)

**Status:** Idea · **Feature id (proposed):** `tutorial` · **Depends on:** most site pages
being public (phase 2), R4 for the XP reward

A slideshow-style guided tour. Users are asked, and gently pushed, to visit several parts of
the site and try several features. They come away knowing where everything is and how it
works.

- Steps like "open the Közelgő meccsek tab", "propose a match time", "open the Szabálytár and
  search for a rule". Each step is checked off when the user actually does it.
- Progress is saved per user, so the tour can be left and resumed. Finishing it earns XP (R4).
- It can start automatically after the first login, and can always be reopened later.

**Open questions:**
- How hard is the push? Can the tour be skipped, or does it only nag until it's done?
- What are the steps? One tour for the whole site, or a short one per feature?
- Steps that would cause real writes (e.g. proposing a time): use a practice/demo match, or
  only show where the button is?
- Is it also shown in phase 1, for the Időpontfoglaló alone?

### R2 · News and events management (Hírek és események kezelése)

**Status:** Idea · **Feature ids:** extends `landing-page` (Hírek) and `timetables`
(Versenynaptár) · **Depends on:** R5 Admin area, the image upload foundation

Admins can **add, edit, remove and pin** news posts and calendar events. A pinned item is
shown first.

- **News:** each news item gets its own sub page by default (e.g. `/hirek/<slug>`). The author
  fills it freely with text and pictures in a content box, laid out however they like.
- **Event:** the admin chooses with a checkbox between:
  - a **small card**: a picture plus a direct link to the event's own site, no sub page; or
  - a **news-style sub page**, where the link to the event is added separately in the
    content.
- **Card picture:** news and event cards can have an uploaded picture. It is compressed
  automatically while keeping good quality.

**Data (draft):** `posts` table (kind news/event, title, slug, body, cover image path,
pinned, published flag, author, timestamps). Events also get a start/end, a place, a type
(online / élő), an external link and the "card only" flag. Images go in a Storage bucket.

**Open questions:**
- Editor: simple blocks (paragraph / picture / link) or rich text? Blocks are safer and
  simpler to render nicely on phones.
- Drafts and scheduled publishing, or publish immediately?
- Post new news/events to Discord automatically?
- Online rounds: should they come from the Meccsszervező rounds table, so they aren't typed in
  twice (see `src/features/timetables/README.md`)?

### R3 · Profile page upgrade (Profil)

**Status:** Idea · **Feature id (proposed):** `profile` (today the profile page lives in the
Meccsszervező at `/meccsszervezo/profil`) · **Depends on:** the image upload foundation

- Users can upload a small picture as their **avatar**. It is resized and compressed
  automatically and shown as a circle across the site (header pill, match rows, rankings).
- **Badges around the avatar:** prepare a frame or ring around the circle that badges can fill
  later, earned as rewards (R4) or bought in the Bolt. **No badge by default.** For now, build
  only the data and the display slot; earning badges comes later.

**Data (draft):** `profiles.avatar_path`, and `profiles.badge_id` (nullable) or a `badges` +
`user_badges` table if users can own several and pick one.

**Open questions:**
- Fall back to the Discord avatar when there's no upload, or to the hero-coloured initials
  used today?
- Moderation: can admins remove an avatar?
- Can a user own many badges and choose the one shown, or only one at a time?
- Move the profile out of `/meccsszervezo` into a site-level account area now (see STATE.md
  → Technical debt)?

### R4 · XP and levels (Tapasztalati pontok)

**Status:** Idea · **Feature id (proposed):** `xp` · **Depends on:** R5 Admin area, the
activity events foundation

Users earn XP through activities and **level up** at set XP milestones.

- **Example sources:** signing up for the Online Bajnokság, played matches, finishing the site
  tutorial (R1). More will be added over time.
- **XP Management page (Tapasztalat kezelés), admins only:** set how much XP each activity
  gives, edit the level thresholds, give or take XP by hand (with a reason), and see a user's
  XP history.
- Users see their level and XP progress on their profile (R3), maybe on the Ranglista too.

**Data (draft):** `xp_rules` (activity key, amount, active), `xp_events` (user, activity,
amount, source reference, created_at, unique per source so nothing is awarded twice),
`levels` (level, min XP). The total is the sum of a user's events, so history and corrections
stay traceable.

**Open questions:**
- How do XP, Jegyek (tickets) and the Bolt relate? Separate currencies (XP = progress,
  tickets = spendable), or does levelling up give tickets or badges?
- Does a "played match" award XP when either player marks it played, or only once both
  confirm? (Note: the Meccsszervező doesn't store match results.)
- Award XP for past activity (round 1 matches) when the system starts?

### R5 · Admin area upgrade (Admin felület)

**Status:** Idea · **Feature id (proposed):** `admin` · **Depends on:** nothing. This is the
foundation for R2 and R4.

Clicking **Admin felület** in the header opens a dedicated admin page. Its own menu
highlights the admin-only tools:

- Hírek és események (R2): create, edit, pin
- Időpontok: adjust match times (exists today in the Meccsszervező admin page)
- Új forduló: start a new round by pasting pairings (exists today)
- Felhasználók: users, Karnyx names, admins (exists today)
- XP kezelés (R4)
- More admin tools later (e.g. the Alkimista's unanswered questions, the shop)

Today the admin tools are all on one page at `/meccsszervezo/admin`. The upgrade splits them
into sections under a shared admin layout. Access is still checked with `requireAdmin()` on
every page and action, whatever the view switch shows.

**Open questions:**
- Address: a site-level `/admin/...` (today `/admin` redirects to `/meccsszervezo/admin`, so
  that redirect would change), or keep it under `/meccsszervezo/admin`?
- A dashboard home (open matches, deadline, unconfirmed players, webhook status), or straight
  into the first tool?

---

## Built

_Nothing from this list yet._ Format: `R# · name · version · date · one line`.

## Dropped

_Nothing yet._ Format: `R# · name · date · why`.

---

## Template for a new item

```markdown
### R# · Name (Hungarian UI name)

**Status:** Idea · **Feature id (proposed):** `kebab-id` · **Depends on:** …

What it does, in the owner's words, then the details as bullets.

**Data (draft):** tables / columns / storage.

**Open questions:**
- …
```
