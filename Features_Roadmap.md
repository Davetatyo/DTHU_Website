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
| **Cosmetics catalogue**: one list of every badge ring, title, rank and emote, what each player owns and what they wear | R3, R4, later the shop | Defined in R3. XP levels (R4), events and the shop only *grant* items from it; the profile settings page is where players choose what to wear. |
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

### R3 · Profile page upgrade and settings (Profil, Profilbeállítások)

**Status:** In discussion (draft 2026-10-31, to finalise with the admins together with R4) ·
**Feature id (proposed):** `profile` (today the profile page lives in the Meccsszervező at
`/meccsszervezo/profil`) · **Depends on:** the image upload foundation, the cosmetics
catalogue foundation; R4 is what fills the collection

**Avatar**
- Users can upload a small picture as their **avatar**. It is resized and compressed
  automatically, then shown as a circle across the site: header pill, match rows, rankings.

**Cosmetics collection (Gyűjtemény), on the profile settings page**
- Players see **every cosmetic they've earned**: badge rings around the avatar, titles,
  rank, emotes, and later shop items.
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
- **The player's own XP:** a level and XP progress block on the profile. The small track next
  to the profile icon is in R4.

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

**Status:** In discussion (draft decisions from the owner, 2026-10-31; to finalise with the
other admins before building) · **Feature id (proposed):** `xp` · **Depends on:** R5 Admin
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

**How XP is earned (first list, will keep growing)**

| Activity | How it's given | How often | Starting XP (adjustable) |
|---|---|---|---|
| Finishing the site tutorial after the first sign-in (R1) | automatic | once | 50 |
| First match played in a tournament | admin | once per tournament | 20 |
| Tournament placement: 1st / 2nd / 3rd / everyone else | admin | once per tournament | 150 / 100 / 75 / 30 |
| Daily Quiz (R7) | automatic | once a day | 10 |
| Quiz level completed (R7) | automatic | once per level, only with 100% correct answers | 15–40, rising with difficulty |
| Attending a live event | admin | once per event | 50 |

The values are a starting point modelled on Duolingo (about 10 XP for a daily task). Admins
fine-tune them on the XP management page.

**Built-in limits (no separate cap needed)**
- Every source is **one-time, once a day or occasional**. Nothing can be repeated endlessly
  for XP.
- Quiz **retakes give no XP**. **Random mode gives no XP**. A quiz level gives XP only when
  it's completed **100% correctly**.
- These limits are written into the code. Admins can't switch them off by accident.

**Levels and seasons**
- Each level needs more XP than the last. Starting curve: going from level *n* to *n*+1 costs
  **20 + 10·(n−1) XP**.
  - That puts level 2 at 20 XP, level 5 at 140, level 10 at 540 and level 20 at 2,090.
  - A very active player (daily quiz, quiz levels, one tournament and an event) reaches about
    level 20 by the end of the season.
- **Season 1 has 20 levels.** A season lasts **3 months**. Admins can adjust the curve.
- Levels have **no names**, except the season's **top level**. Admins name it after the
  current Dice Throne season.
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
- A player sees their own XP and level on their **profile**, plus a **small progress track
  next to their profile icon** in the header.
- Other players never see someone's XP or level. They only see the cosmetics that player
  chose to wear.

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
- `xp_levels`: level, XP needed, season, name.
- `xp_rewards`: level → cosmetic from the R3 catalogue. Reaching the level adds the item to
  `user_cosmetics`.
- `xp_boosts`: start, end, multiplier.
- `xp_admin_log`.
- A user's total is the sum of their `xp_events` rows. This needs a separate test Supabase
  project before building.

**Suggested build order:**
1. The admin-given sources and the XP management page (works without the tutorial or the
   quiz).
2. The profile XP track, the cosmetics catalogue and the collection page (R3).
3. The automatic sources, as R1 and R7 are built.

**Open questions (to settle with the admins):**
- **XP past the season's top level:** XP is lifetime, but season 1 stops at level 20.
  Proposal: the level cap rises each season (season 2 opens levels 21–40, and so on). XP
  earned at the cap
  - (a) keeps counting and is applied when the next season opens (proposed); or
  - (b) is not earned until then.
- **First match played:** once per tournament (proposed), or once ever?
- **Daily Quiz:** XP only for a correct answer (proposed, in line with the 100% rule), or for
  answering at all?
- **Double XP:** only the automatic sources (proposed), or the admin-given ones too?
- **Level number:** hidden from other players too (proposed), or visible without the XP?
- **Starting values and curve:** OK as a placeholder?
- **Rewards:** which cosmetic for each level and milestone?

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

**Status:** Idea · **Feature id (proposed):** `games` · **Depends on:** nothing to start (a
page of cards). Games that award XP need R4.

A new site section that keeps users engaged and coming back. It introduces games one by one.

- **Hub page** (e.g. `/jatekok`): one **card per game**, with a picture, a name, a short
  description and a status such as "Új", "Hamarosan" or the user's progress.
- Each game is its own feature with its own sub page. Games can be added or retired without
  touching the others (a small registry, like `src/features/registry.ts`).
- The first game is the Quiz (R7). Others get added here as new **R#** items when the owner
  thinks of them.

**Open questions:**
- Is the hub a top-level menu item (next to Ranglista, Versenynaptár…) or under another one?
- Do signed-out visitors see the games, or only logged-in users? Do they play without saving
  progress or XP?
- Show leaderboards per game (e.g. quiz points this week), or keep it personal?

### R7 · Quiz (Kvíz)

**Status:** Idea · **Feature id (proposed):** `quiz` (a game inside R6) · **Depends on:** R6
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
