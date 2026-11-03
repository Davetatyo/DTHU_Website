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
| In discussion | The owner has written draft decisions; they are being finalised with the other admins. |
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
| **Admin area**: a dedicated admin page with its own menu | R2, R4, R5, R7 | That page is item R5. Every admin tool below plugs into its menu. |
| **Image upload**: Supabase Storage bucket, resize and compress before saving | R2, R3 | One shared helper: resize to a max size and compress, keeping quality reasonable (e.g. WebP), on the client before upload. Size limits and allowed types are enforced by the bucket policy. |
| **Cosmetics catalogue**: one list of every badge ring, title, rank and emote, what each player owns and what they wear | R3, R4, R6 games, events, later the shop | Defined in R3. XP levels (R4), events, games and the shop only *grant* items from it; the Gyűjtemény (R3) is where players choose what to wear. |
| **Separate dev Supabase project** | all items with new tables | STATE.md → Technical debt. Local development uses the live database today. New tables and uploads should be tried on a dev project first. |
| **Activity events**: one place where "something happened" is recorded | R4, R7, later tickets/shop | XP (and later tickets) are awarded from events such as a played match, a sign-up or a finished tutorial. Design this together with the XP system. |
| **Once-a-day / first-login prompts**: show something once per user per day or until done | R1, R7 | The tutorial starting after the first login and the Daily Quiz popping up on the first login of the day should use one mechanism, so they don't pile up on top of each other. |

Suggested order, based on what depends on what (the owner decides the real order):
**R5 Admin area → R2 News & events → R3 Profile → R4 XP → R6 Games → R7 Quiz → R1 Tutorial.**
The tutorial goes last because it walks users through the other features and awards XP. The
Games hub (R6) is cheap and could come earlier, but its first game (R7) needs XP and admin
question management.

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

**Status:** **Events: built and live for admins** (v2.3–v2.4, 2026-11-03; see
`src/features/timetables/README.md`). **News: built on `feature/landing-page`** (2026-11-03, not merged yet; see
`src/features/landing-page/README.md`). ·
**Feature ids:** `timetables` (Eseménynaptár, renamed from Versenynaptár) and `landing-page`
(Hírek) · **Depends on:** the image upload foundation and the event editor (both built). Admin
pages live under today's Admin felület until R5.

#### Events (done)

Owner decisions (2026-11-03): kinds Online bajnokság (rounds automatic) / Élő verseny /
Asztali nap / közösségi játék / Egyéb + "Ötlet / tervezett"; admin-only until the full site
opens; every admin edits; simple blocks; past events greyed in an archive at the bottom;
drafts by default, publish now or scheduled; "card only" events link straight to their site;
Discord announcements later via a separate webhook and channel. Built: `events` table
(migration 0003), Admin felület → Események kezelése, `/esemenynaptar`, event pages
`/esemenynaptar/<slug>`.

#### News (Hírek): built, waiting for the owner's live test

Same base as events: **Admin felület → "Hírek kezelése"** card **above** the Eseménynaptár
card (list, Új hír, edit, delete); draft by default → publish now / scheduled / back to draft;
admins can preview drafts; card picture with crop; content blocks; a permanent address from
the title (`/hirek/<slug>`).

What news adds (owner decisions, 2026-11-03):
- **Category (rovat)** with a coloured label and a filter on the list page: Bajnokság,
  Közösség, Élő esemény, Oldal / fejlesztés; Jegyek & Bolt later.
- **Header:** author name **with their profile picture**, publish date, a "Frissítve" date when
  edited after publishing, and a **bevezető** (lead, 1–2 sentences) on the card and in bold at
  the top of the article.
- **Inline formatting** in paragraphs: bold, italic and links, from toolbar buttons (stored as
  a safe subset, never raw HTML).
- **More blocks** (all in the first version): Felsorolás (bullet/numbered list), Idézet,
  Kiemelt doboz (info/warning), Galéria (grid, opens larger on tap), Videó (YouTube and Twitch
  embeds only), Esemény kártya (an event from the Eseménynaptár; the event page then lists
  "Kapcsolódó hírek"), Elválasztó. Plus the event blocks: alcím, bekezdés, kép, link.
- **Where it shows:** the home page (`/`) shows the latest 4 news cards (pinned first) and a
  "Minden hír ›" link; a new list page `/hirek` with every article, newest first, category
  filter and "Régebbi hírek" paging; article pages with previous/next links.
- **Pinning:** pinned until an admin unpins it (no end date).
- **Share previews** (Open Graph: cover, title, lead) for Facebook and Discord links; they
  start working once the site is public.
- **Szavazás (polls)** in articles (added 2026-11-03, built): single/multi choice, optional
  "Egyéb", closing time; logged-in voters, one changeable vote; results after voting; a
  results block and "Új hír az eredményből" for follow-up articles. Voting could earn XP
  later (R4).
- **No user reactions or comments for now**, but keep the article page open for it: a later
  idea is a "read it" confirmation with an emoji that earns XP (see R4).
- **Later:** automatic Discord/Facebook announcement through a separate webhook (same as
  events).

**Data (draft):** `news` table: slug, title, category, lead, body (blocks, jsonb), cover path,
pinned, published_at (null = draft), author (profile), created/updated by and at,
"Frissítve" time. Pictures in a storage bucket (reuse `event-images` or a new `news-images`).
Event card blocks store the event id; "Kapcsolódó hírek" is read from the blocks.

**Build plan:** branch `feature/landing-page`, in phases like the Eseménynaptár: (1) table +
admin list/new/edit with the shared blocks, (2) inline formatting and the new blocks, (3)
article page, `/hirek` list and the home page cards, (4) share previews and "Kapcsolódó
hírek" on event pages. Then push to `main` for the owner's live test.

### R3 · Profile page upgrade and settings (Profil, Profilbeállítások)

**Status:** Avatar part **built and live for everyone** (v2.2, 2026-11-02: upload with crop,
shown everywhere, admin remove/replace, plus admin "Profil szerkesztése" and bans; see
`src/features/profile/README.md`). **Gyűjtemény: needed** (owner, 2026-11-03): more and more
badges will be rewarded for events and games, so players need one place to see and wear them.
Not built yet. ·
**Feature id:** `profile` (today the profile page lives in the Meccsszervező at
`/meccsszervezo/profil`) · **Depends on:** the image upload foundation, the cosmetics
catalogue foundation; R4 is what fills the collection

**Avatar**
- Users can upload a small picture as their **avatar**. It is resized and compressed
  automatically, then shown as a circle across the site: header pill, match rows, rankings.

**Cosmetics collection (Gyűjtemény), on the profile settings page**
- Players see **every cosmetic they've earned**: badge rings around the avatar, titles,
  rank, emotes, and later shop items.
- **Where badges come from** (owner, 2026-11-03): XP levels and milestones (R4), **events**
  (e.g. attending a live event, tournament placements) and **games** (e.g. a Szemfüles or
  Kockázat achievement). The list of sources will keep growing, so a badge only needs a
  catalogue row and a "grant" call from the feature that awards it.
- Linked from the profile's level block ("Viselt jelvény: … · Gyűjtemény", see R4 → Look).
- They choose what to **wear** and can switch to any earned item at any time, or wear
  nothing.
- **One item per slot:** one badge ring, one title, one rank display. The number of emote
  slots is still open.
- **Nothing is worn by default.** No badge ring around the avatar until the player picks one.
- Newly earned items are marked "Új" until the player has looked at them. A level-up can
  also suggest wearing the new item, but never equips it on its own.
- **Locked items:** show the ones not yet earned greyed out, with how to get them (e.g. "Érd
  el a 10. szintet")? Or keep them hidden as a surprise? (Open question.)
- **What others see:** only the worn cosmetics, next to the player's name and avatar. Never
  their XP or level (R4).
- **The player's own XP:** a level and XP progress block on top of the profile page, and a
  thin XP bar under the name in the header. Decided look: R4 → Look.

**Data (draft):**
- `profiles.avatar_path`.
- `cosmetics` (the catalogue): type (badge ring / title / rank / emote / …), name, image,
  where it comes from (level, milestone, season top level, event, shop), active.
- `user_cosmetics` (what a player owns): user, cosmetic, earned_at, source, seen.
- `user_equipped` (what a player wears): user, slot, cosmetic. One row per slot, so new slots
  can be added later without schema changes.

**Open questions:**
- Fall back to the Discord avatar when there's no upload, or to the hero-coloured initials
  used today?
- Moderation: can admins remove an avatar? Can they take away a cosmetic?
- Show locked cosmetics (and how to earn them), or keep them hidden?
- Emotes: what are they and where do they show (next to the name, on match pages, as
  reactions)? How many can be worn at once?
- Move the profile out of `/meccsszervezo` into a site-level account area now (see STATE.md
  → Technical debt)?

### R4 · XP and levels (Tapasztalati pontok)

**Status:** XP values and level curve **agreed with the owner** (2026-11-03), look decided
(option C, see Look); not built · **Feature id (proposed):** `xp` · **Depends on:** R5 Admin
area (XP management page), R3 Profile (cosmetics collection, badge ring). The automatic
sources need R1 Tutorial and R7 Quiz.

Users earn XP for activities and level up at rising milestones, in the style of Duolingo.

**What XP is**
- XP is **never spent**. It only raises the level.
- Levels give **cosmetic rewards**: badges, titles, rank, emotes, and later unlocked shop
  items. Players collect them and choose what to wear in their profile settings (R3).
- A separate digital currency for the website comes later and has nothing to do with XP.
- XP is **lifetime** and never resets.
- Everyone starts from **zero** at launch. Nothing is backfilled.

**Ground rules (owner, 2026-11-03)**
- The smallest XP step is **5 XP**: every value and level cost is a multiple of 5.
- **One year, at most 20 levels.** Level 20 is reachable for anyone who joins everything
  (events, tutorials, games, news, the daily quiz). It takes dedication, not skill, apart
  from the quiz, which pays only for correct answers.
- Tournament **podium places give big extra XP**, so strong but less active players can
  catch up.
- "Season" means the **official Dice Throne season** and its theme: the top level is named
  after it. The XP plan itself is counted per year.

**How XP is earned (agreed values; the list will keep growing)**

| Activity | XP | Rule | Given | Max in a year |
|---|---|---|---|---|
| Welcome: first sign-in to the site with Discord | 10 | once ever, no Karnyx name needed | automatic | 10 |
| Site tutorial (R1) | 50 | once | automatic | 50 |
| Other tutorials: tournament rules, new site features (R1) | 25 | each once, about 6 a year | automatic | 150 |
| Daily Quiz (R7) | 5 | **only for a correct answer**, once a day | automatic | 1,825 at 100% / ~1,460 at 80% |
| First match played in a tournament | 10 | when the player's first match is marked Lejátszott; a Bye doesn't count | automatic | 120 |
| Finishing a tournament | 30 | ends with a place, even the last; a Bye in the first or last round still counts as in; no XP for dropping out midway or not showing up (they keep the first-match XP if they had it) | automatic when the tournament closes: everyone who played or had a Bye in every round | 360 |
| Podium extra: 1st / 2nd / 3rd | 150 / 100 / 75 | on top of the 30 | admin (like the Sorsolás podium tickets) | catch-up, not counted in the max |
| Taking part in a live event | 50 | per event, about 12 a year | admin | 600 |
| Playing a game for the first time (R6) | 25 | once per game, about 6 | automatic | 150 |
| Szemfüles: a picture done with 100 points (all 10 found) | 5 | **once per picture**, about 2 new pictures a month; no cheat check (owner: "if someone cheats they deserve it") | automatic | ~140 |
| Reading an important news article and confirming it (R2) | 5 | per marked article, about 2 a month | automatic | 120 |
| **Joining everything, all quiz answers right** | | | | **~3,525** |
| **Joining everything, 80% right** | | | | **~3,160** |

Frequencies assumed: 12 online tournaments a year (monthly) and about 12 live or community
events. Admins fine-tune values on the XP management page.

**Built-in limits (no separate cap needed)**
- Every source is **one-time, once a day, once per item or occasional**. Nothing can be
  repeated endlessly for XP (e.g. replaying a Szemfüles picture gives nothing new).
- Quiz: **only correct answers** give XP; retakes and random mode give none; a quiz level
  gives XP only when completed **100% correctly**.
- These limits are written into the code. Admins can't switch them off by accident.

**Levels (agreed curve)**
- Level 1 → 2 costs **25 XP**, and every level costs **15 XP more** than the one before
  (level *n* → *n*+1 costs 25 + 15·(n−1)). Level 20 needs **3,040 XP** in total.
- The one-off sources (welcome, site tutorial, first plays, existing Szemfüles pictures, ~180
  XP) take a new player to about level 5 in the first week. After that, roughly one level
  every 3–5 weeks.
- Milestones: levels **5, 10, 15, 20** (badges and titles).

| Level | XP for this level | Total XP | Joins everything, 80% quiz | Joins everything, 100% quiz |
|---|---|---|---|---|
| 2 | 25 | 25 | week 1 | week 1 |
| 3 | 40 | 65 | week 1 | week 1 |
| 4 | 55 | 120 | week 1 | week 1 |
| **5** | 70 | **190** | week 1 | week 1 |
| 6 | 85 | 275 | week 2 | week 2 |
| 7 | 100 | 375 | week 4 | week 3 |
| 8 | 115 | 490 | week 6 | week 5 |
| 9 | 130 | 620 | week 8 | week 7 |
| **10** | 145 | **765** | week 11 | week 10 |
| 11 | 160 | 925 | week 13 | week 12 |
| 12 | 175 | 1,100 | week 17 | week 15 |
| 13 | 190 | 1,290 | week 20 | week 18 |
| 14 | 205 | 1,495 | week 23 | week 21 |
| **15** | 220 | **1,715** | week 27 | week 24 |
| 16 | 235 | 1,950 | week 31 | week 28 |
| 17 | 250 | 2,200 | week 36 | week 32 |
| 18 | 265 | 2,465 | week 40 | week 36 |
| 19 | 280 | 2,745 | week 45 | week 40 |
| **20** | 295 | **3,040** | **week 50** | **week 45** |

**Example players over one year**

| Player | XP | Level |
|---|---|---|
| Joins everything, all quiz answers right | ~3,525 | 20 (week 45) |
| Joins everything, 80% right | ~3,160 | 20 (week 50) |
| Joins everything, 60% right | ~2,795 | 19 |
| Plays every tournament, nothing else | ~540 | 8 |
| Same, with 2 golds, 2 silvers and 2 bronzes | ~1,190 | 12 |
| Same, with 4 golds, 3 silvers and 2 bronzes | ~1,590 | 14 |
| Casual: quiz every second day at 80%, 6 tournaments, 4 events | ~1,330 | 13 |
| Only the quiz, 80% right | ~1,470 | 13 |

- Levels have **no names**, except the **top level**, named after the current official Dice
  Throne season.
- Reaching the top level earns a **special badge ring** around the profile picture.

**Rewards**
- Every level-up gives a **small cosmetic upgrade**.
- **Milestone levels** (e.g. 5, 10, 15, 20) give **badges and titles**. Later they also unlock
  shop items.
- Admins decide which reward belongs to which level.
- Rewards land in the player's **cosmetics collection** (R3), marked "Új". The player decides
  whether to wear them; nothing is equipped automatically.
- **Double XP periods:** an admin sets a start and an end, and the automatic sources give
  2× XP during that time.

**Visibility**
- **No XP leaderboard.**
- A player sees their own XP and level on their **profile**, plus a **thin XP bar under their
  name** in the header (see Look below).
- Other players never see someone's XP or level. They only see the cosmetics that player
  chose to wear.

**Look (decided by the owner, 2026-11-03: "option C", not built yet)**
- Mockup screenshots and the mock code: `docs/mockups/xp-option-c/` (made on the real pages
  in a scratch copy with example data: Dave, level 5, 172 XP, wearing a badge ring). The
  numbers in the mockup come from the earlier draft curve; with the agreed curve 172 XP is
  level 4, and the profile line reads "… XP kell még · összesen … XP" (no season counter).
- **Header profile chip** (after the coin|ticket capsule, same 32 px height): the avatar
  carries the **worn badge ring** only (nothing around it when no badge is worn). Under the
  name sits a **3 px gold XP bar** showing progress to the next level. Hover/title:
  "5. szint · 172 / 200 XP". No level number on the avatar, so the area stays quiet.
- **Profile page, on top:** a level block. The big avatar with its badge ring and a gold
  "5. szint" label under it; the name; "Viselt jelvény: <name> · Gyűjtemény"; a progress bar
  from this level to the next; "28 XP kell még · összesen 172 XP · 1. szezon, 20 szint";
  "Legutóbbi XP" (activity, date, +amount); a note that only the player sees level and XP.
  On phones the block stacks and centres.
- **Rejected:** a ring around the avatar that fills up (the owner's first idea), and the
  variants with the XP ring outside or inside a badge ring: too much noise around the
  picture once badges exist.
- Top level: the bar stays full and the profile says "Csúcsszint". Level-up feedback is
  still open (see below).

**Admin controls (XP kezelés page, admins only)**
- Change the XP value of each activity, turn activities on and off, and edit the level curve
  and the season's top-level name.
- Set the rewards per level, start and stop double XP periods, and give or take XP by hand
  with a reason.
- View any user's XP history.
- **New kinds of activity need code first.** Each one has a fixed key in the code and a row in
  the activities list. A release adds the key; admins then set its value and switch it on.
  Every admin change is logged: who, when, old and new value.
- **Changes apply from then on only.** XP already earned is never recalculated.

**Data (draft):**
- `xp_activities`: key, name, XP amount, how often, automatic or admin, active.
- `xp_events`: user, activity, amount, multiplier, source reference, reason, given by, time.
  A unique key stops double awards, e.g. the same activity + user + day/tournament/quiz level.
- `xp_levels`: level, XP needed, name (the top level takes the Dice Throne season name).
- `xp_rewards`: level → cosmetic from the R3 catalogue. Reaching the level adds the item to
  `user_cosmetics`.
- `xp_boosts`: start, end, multiplier.
- `xp_admin_log`.
- A user's total is the sum of their `xp_events` rows. This needs a separate test Supabase
  project before building.

**Suggested build order:**
1. The admin-given sources and the XP management page (works without the tutorial or the
   quiz).
2. The header XP bar and the profile level block (Look above), the cosmetics catalogue and
   the Gyűjtemény page (R3).
3. The automatic sources, as R1 and R7 are built.

**Open questions (to settle with the admins):**
- **After the first year / past level 20:** XP is lifetime. Does the cap rise for the next
  year (levels 21–40), and does XP earned at level 20 keep counting until then (proposed)?
- **Double XP:** only the automatic sources (proposed), or the admin-given ones too?
- **Level number:** hidden from other players too (proposed), or visible without the XP?
- **Rewards:** which cosmetic for each level and milestone?
- **Level-up moment:** is the bar filling up enough, or a one-time "Szintlépés! 6. szint"
  popup on the next visit?

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

### R6 · Games section (Játékok)

**Status:** Built (hub, v2.11, 2026-11-03): Játékok tab after Bolt, cards for Taktikai Előny
(R11) and the parked Kvíz ("Hamarosan"). · **Feature id:** `games` · **Depends on:** nothing.
Games that award XP need R4.

A new site section that keeps users engaged and coming back. It introduces games one by one.

- **Hub page** (e.g. `/jatekok`): one **card per game**, with a picture, a name, a short
  description and a status such as "Új", "Hamarosan" or the user's progress.
- Each game is its own feature with its own sub page. Games can be added or retired without
  touching the others (a small registry, like `src/features/registry.ts`).
- The first game is the Quiz (R7). Others get added here as new **R#** items when the owner
  thinks of them.

**Open questions:**
- Is the hub a top-level menu item (next to Ranglista, Eseménynaptár…) or under another one?
- Do signed-out visitors see the games, or only logged-in users? Do they play without saving
  progress or XP?
- Show leaderboards per game (e.g. quiz points this week), or keep it personal?

### R7 · Quiz (Kvíz)

**Status:** Parked by the owner (2026-11-03; plan discussed: level map, reveal animations); shown as "Hamarosan" on the Játékok page. Was: Idea · **Feature id (proposed):** `quiz` (a game inside R6) · **Depends on:** R6
hub, R4 XP (for rewards), R5 Admin area (for managing questions)

Quizzes on the website in **increasing difficulty**. Users learn the game and earn XP.

- **Categories (quiz types):**
  - Szabályok: rules
  - Karakterek: characters and heroes
  - Helyzetmegoldás: deep situational problem solving
  - Sebzésszámítás: damage calculation
  - Szórakoztató: fun questions
  - Detektív rejtvények: detective-style riddles
  - …more later
- **Difficulty:** quizzes are **not random**. Each category has fixed levels, from easy to
  hard. Harder levels unlock as easier ones are completed and give more XP.
- **XP rules (owner decisions, 2026-10-31; details in R4):**
  - A quiz level gives XP **only when completed 100% correctly**, and **only once**. Retakes
    give no XP.
  - A **random mode** (questions from the whole pool) is just for practice and **gives no
    XP**.
- **Daily Quiz (Napi kvíz):** a random question from the pool **pops up the first time a user
  logs in each day**. It gives a small XP reward (only for a correct answer, proposed in R4).
  It shows once a day, and can be dismissed.
- **Learning:** after each answer, show the right answer with a short explanation, and link to
  the rule in the Szabálytár where it fits.
- **Question pool:** admins add and edit questions on the admin area (R5). Each question has a
  category, difficulty, question text (optionally a picture, e.g. a dice roll or board
  situation), answer options, the correct answer and an explanation.

**Data (draft):** `quiz_questions` (category, difficulty, body, image path, options, correct
answer, explanation, active), `quiz_attempts` (user, question or quiz, correct, answered_at),
`daily_quiz` (date → question, or one random pick per user per day). XP goes through the
`xp_events` of R4, unique per question/day so it can't be farmed.

**Open questions:**
- Answer formats: multiple choice only, or also number input (good for damage calculation)
  and free text (good for riddles)?
- Time limits per question, or untimed?
- Daily Quiz: the same question for everyone each day (comparable, can be discussed on
  Discord), or a different random one per user? (No streaks: the owner decided against a
  streak system, see R4.)
- Who writes the first question pool, and how many questions per category to launch with?
  Can players suggest questions for admins to approve?

### R8 · Discord login without the repeated Authorize screen (Belépés)

**Status:** Ready to plan (the owner wants it, not now; added 2026-11-02) · **Feature id:**
none, a small fix to `match-organizer` login (branch `fix/discord-prompt`) · **Depends on:**
nothing

Today Discord shows its **"Authorize" screen on every login**, even to players who approved
DTHU before (e.g. after Kilépés, or on a new browser).

- **Cause:** the login request doesn't send Discord's `prompt` setting, and Discord's default
  is to ask every time. See `signInWithOAuth` in `src/app/meccsszervezo/login/page.tsx`.
- **Fix:** add `queryParams: { prompt: "none" }` to the `signInWithOAuth` options. Discord then
  skips the screen for players who already authorised the app. First-time players should
  still see it once; confirm this with a fresh Discord account.
- **A cookie on our side can't solve this:** the screen is Discord's, shown before anything
  reaches dthu.hu. Our Supabase session cookie already keeps players logged in until they
  click Kilépés.
- **Not affected by the fix:** players who aren't logged in to Discord in that browser still
  get Discord's own login page. In-app browsers (Facebook, Discord) keep their own cookies,
  so players log in there once separately.
- **Testing:** Discord login only works on dthu.hu and `localhost:3000`. After deploying:
  log out, log in again, and check that the Authorize screen is skipped.

**Open questions:** none.

---

### R9 · Linkek managed by admins (Linkek kezelése)

**Status:** Built and live for admins (v2.7, 2026-11-03; see
`src/features/links/README.md`). · **Feature id:** `links` · **Depends on:** nothing

Admins add, edit, reorder, hide and delete the Linkek page's links, with or without a
picture. Owner (2026-11-03): keep it simple, same logic as the other editors; the editor sits
on Admin felület under the Eseménynaptár card. No drafts or scheduling: a link shows as soon
as it's saved; "Látható" off hides it.

**Data:** `links` table (title, url, description, image_path, sort_order, visible) with the
four former links; pictures in the `link-images` bucket (migration 0006).

**Open questions:** none.

---

### R10 · Szabálytár: the Hungarian RulePop on the site (Szabálytár)

**Status:** In progress: phase 1 live for admins (v2.8); the 5 newer heroes and their tokens
translated (v2.9, 2026-11-03).
· **Feature id:** `rulebook` · **Depends on:** nothing

The owner's Hungarian RulePop (dice-throne-rulepop-hu.vercel.app, his translation of
dice-throne.rulepop.com) moves under the Szabálytár tab: "not a revamped copy but more of the
same fitted into the new design", with everything it has.

Owner decisions (2026-11-03):
- Popups like RulePop (instant), and every rule, hero and token has its own link.
- Before going public, update to the latest rulepop.com: the agent drafts the missing parts in
  the style and vocabulary of the existing Hungarian pages; the owner reviews.
- Adventures and Marvel co-op are out (not imported, and not to be added).
- No Visszajelzés, no admin editing (edits in the repository), no download/app install.
- The old RulePop HU site stays online after the Szabálytár goes public.

Phases: 1 import + start page + popups/pages (heroes and tokens included) ✅ · 3 search and
Tárgymutató · 4 hero filter settings · 5 missing content (5 heroes: Druid, Duelist,
Forgemaster, Mystic Brawler, Sun Elf; 13 tokens; ~20 core pages such as Ability, Activate,
Sell, Small/Large Straight; a few changed pages) · 6 update checker against rulepop.com, final
checks. Details: `src/features/rulebook/README.md`.

**Open questions:** none.

---

### R11 · Taktikai Előny (the Hadvezér guesses your hero)

**Status:** Built and live for admins (v2.11, 2026-11-03; see `src/features/games/README.md`).
· **Feature id:** `games` · **Depends on:** the Szabálytár (hero list, tokens, portraits)

The Hadvezér (Tactician) guesses which Dice Throne hero the player thinks of, from yes/no
answers. Opens with his portrait and the line "Azt hiszed lehetnek titkaid előttem? Minden
eshetőségre felkészültem! Készen állsz?", then he moves into the background (second picture).
Owner decisions (2026-11-03): at most 10 questions and 3 guesses; yes/no only; logged-in
players; no saved games or XP for now (XP later with R4). Later (v2.12): a "Nem tudom" button
(doesn't count towards the 10), no Season questions, no single-hero questions, the game is
centred on the screen when opened.

**Open questions:** the owner reviews the hero facts table (`lib/tactician-traits.ts`),
especially "nő", "sötét teremtmény" and "varázslat".

---

### R12 · Kockázat (dice poker against the Barbarian)

**Status:** Built and live for admins (v2.13, 2026-11-03; see `src/features/games/README.md`).
· **Feature id:** `games` · **Depends on:** nothing

Dice poker in the classic style against the Barbarian. He greets you as a stern warrior ("Üdvözlégy
harcos! Látom egy kis izgalomra vágysz! Készülj a harcra!"), then turns into your biggest fan,
cheering your rolls while he plays his own turns. Owner decisions (2026-11-03): he really
plays (a distractible amateur); he asks how much time you have (short 7 rounds / full 13
rounds); Ultimate = five of a kind (50), 63 → +35 bonus; CSS 3D dice; no sound for now;
logged-in players; no saving or XP yet.

**Open questions:** none.

---

### R13 · Szemfüles (spot the differences)

**Status:** Built and live for admins (v2.17, 2026-11-03; see `src/features/games/README.md`).
· **Feature id:** `games` · **Depends on:** nothing

Spot-the-differences pictures to choose from; the first is "Tea Party" (10 differences).
Owner decisions (2026-11-03): +10 per difference, −5 per wrong tap (never below 0); 60
seconds, then the score counts; titles 100% Szemfüles, 80% Sasszem, 60% Ügyeske, otherwise a
congratulation. New pictures: the owner sends two images, the differences are marked in code
(an admin upload screen is possible later).

**Open questions:** none.

---

## Built

Format: `R# · name · version · date · one line`. (Built items keep their full entry above
while their docs point there.)

- R2 · Events (Eseménynaptár) · v2.3–v2.4 · 2026-11-03 · real events, admin editor, event pages.
- R2 · News (Hírek) + Szavazás · v2.5–v2.6 · 2026-11-03 · news admin, rich articles, polls.
- R9 · Linkek kezelése · v2.7 · 2026-11-03 · admin-managed links with pictures and order.
- R6 · Játékok hub · v2.11 · 2026-11-03 · games tab with cards.
- R11 · Taktikai Előny · v2.11 · 2026-11-03 · the Hadvezér guesses your hero.
- R12 · Kockázat · v2.13 · 2026-11-03 · dice poker against the Barbarian.
- R13 · Szemfüles · v2.17 · 2026-11-03 · spot the differences, first picture Tea Party.

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
