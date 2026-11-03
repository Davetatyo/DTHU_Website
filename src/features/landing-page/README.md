# Hírek (home page and news)

| | |
|---|---|
| Folder | `src/features/landing-page/` |
| Branch | `feature/landing-page` |
| Roadmap | R2 (News and events management): the news half |
| Routes | `/` (home), `/hirek` (all news, `?rovat=` filter, `?oldal=` paging), `/hirek/<slug>` (article); admin: `/meccsszervezo/admin/hirek` (list), `…/uj` (new), `…/<id>` (edit) |
| Database | `supabase/migrations/0004_news.sql`: table `news`, storage bucket `news-images`; `0005_polls.sql`: tables `polls`, `poll_votes` |
| Status | **preview**: admins only until the full site opens |

## What it does

**Home page (`/`).** The tournament banner and the match schedule (real Időpontfoglaló data),
the **latest 4 news** (pinned first) with "Minden hír ›", the power ranking and the ticket tile
(still sample data, see `rankings`, `tickets`).

**News list (`/hirek`).** Every published article, pinned first, then newest; category filter
(Bajnokság, Közösség, Élő esemény, Oldal / fejlesztés) and 12 per page ("Régebbi hírek").

**Article (`/hirek/<slug>`).** Cover, category, title, author with profile picture, date,
"Frissítve" (saved again 10+ minutes after going live), the bevezető in bold, the content
blocks, previous/next article. Share previews (Open Graph: cover, title, bevezető) for
Facebook and Discord, readable once the site is public. Admins can open drafts and scheduled
articles with a notice.

**Admin** (every admin): Admin felület → "Hírek kezelése" (above the Eseménynaptár card). New
articles are drafts; edit page: card picture (16:9 crop), title, category, author (any
admin), bevezető, pin (until unpinned), content, then Mentés / Közzététel most / Időzített
közzététel / Visszavonás piszkozatba / Törlés.

**Content blocks** (all of them, `src/lib/content-blocks.ts`): Alcím, Bekezdés, Felsorolás
(bullets or numbers), Idézet, Kiemelt doboz (info / warning), Kép, Galéria (grid, tap to
enlarge), Videó (YouTube via youtube-nocookie, Twitch videos and channels), Link, Esemény
kártya (a published event; the event page lists the article under "Kapcsolódó hírek"),
Elválasztó. Text blocks support **bold**, *italic* and [links](https://…) from the B / I / 🔗
buttons; stored as marks, shown as React elements, never HTML.

**Szavazás (polls)** — the "+ Szavazás indítása" block: question, 2–20 options, one or
several choices, optional "Egyéb" with a text box, closing date and time (admin's browser
time). Saved to `polls` with the article (deleting the block or the article deletes the poll
and its votes; options that already have votes can't be removed, only renamed). Owner
decisions (2026-11-03): logged-in users only, one vote per account, changeable until closing;
results after voting (everyone after closing, admins always), refreshed every 10 s; votes
anonymous; "Egyéb" answers public without names; admin-only like the rest of Hírek for now.
"+ Szavazás eredménye" shows any poll's results (final or current) in another article, and
the admin button "Új hír az eredményből" on a poll creates a draft with that block and a link
back to the original article.

## Code

- `lib/news.ts` (pure, tested): categories, the admin form, block rules, "Frissítve".
- `lib/polls.ts` (pure, tested): closing, vote checks, counting, who sees results;
  `lib/polls-data.ts` (server); `actions/polls.ts` (vote, refresh, new article from results);
  `components/PollCard.tsx` (client: vote form, live results, admin button).
- `lib/news-data.ts` (server): reads, paging, previous/next, authors, articles about an event.
- `actions/news.ts`: create, save/publish, delete, picture upload/remove (admin only).
- `components/NewsCard.tsx`, `components/NewsFormFields.tsx`.
- Shared with events: `src/lib/publishing.ts` (draft/scheduled/live, slugs, safe links),
  `src/lib/content-blocks.ts` + `src/lib/inline-format.ts` (blocks, tested),
  `src/lib/content-images.ts` (storage), `src/components/content/` (CoverEditor,
  BlocksEditor, ContentBody, Gallery, InlineText).

## Later

- Reactions / "read it" confirmation with an emoji that earns XP (roadmap R2 and R4).
- Automatic Discord/Facebook announcement through a separate webhook.
- The "Jegyek & Bolt" category (already allowed in the database) once those features exist.
