# Eseménynaptár (events calendar)

Named **Versenynaptár** until 2026-11-03; the internal id and folder stay `timetables`.

| | |
|---|---|
| Folder | `src/features/timetables/` |
| Branch | `feature/timetables` |
| Roadmap | R2 (News and events management): the events half |
| Routes | `/esemenynaptar` (calendar), `/esemenynaptar/<slug>` (event page); admin: `/meccsszervezo/admin/esemenyek` (list), `…/uj` (new), `…/<id>` (edit). `/versenynaptar` redirects. |
| Database | `supabase/migrations/0003_events.sql`: table `events`, storage bucket `event-images` |
| Status | **preview**: admins only until the full site opens (owner, 2026-11-03) |

## What it does

**Calendar page.** Tiles (or a month calendar, remembered per browser) of every published
event plus the active tournament's online rounds, which come from the Időpontfoglaló's
`rounds` table so nobody types them in twice. Pinned events first, then by date. Past events
stay visible, greyed out, under "Elmúlt események"; their links still work. The month view
also shows confirmed matches. The season timeline under the header (`SeasonPhases`) uses the
same data.

**Event kinds:** Online bajnokság (rounds are automatic; the kind is for other online events),
Élő verseny, Asztali nap / közösségi játék, Egyéb, plus an "Ötlet / tervezett" flag (dashed
frame).

**Admins** (every admin) manage events under Admin felület → Események kezelése:
- "Új esemény" saves a **draft**. On the edit page: card picture (cropped to 16:9 in the
  browser, 1280×720), basic fields, content blocks, and the buttons: Mentés, Mentés és
  közzététel most, Időzített közzététel (go-live time in the future), Visszavonás
  piszkozatba, Törlés (with confirmation).
- Scheduled events appear by themselves: the site compares `published_at` with the current
  time on every page load, no cron job needed.
- "Csak kártya": the tile links straight to the event's own site (needs the link), no event
  page.

**Event page** (`/esemenynaptar/<slug>`): cover, kind, date, place, short description,
content blocks (heading, paragraph, picture with caption, link button), the event link.
Admins can open drafts and scheduled events with a notice; everyone else gets 404 until it's
live. The slug comes from the title at creation and never changes.

## Code

- `lib/events.ts`: kinds, publish states, dates, slugs, content blocks (`parseBlocks`: text
  only, http(s) links only, pictures only from the event's own folder), calendar view model.
  `lib/event-form.ts`: the admin form (admin's time zone; no start time = all-day) and the
  publish buttons. Both unit-tested.
- `lib/events-data.ts` (server): reads events and rounds; `lib/event-images.ts` (server):
  picture storage and clean-up of unused pictures on save and delete.
- `actions/events.ts`: create, save/publish, delete, picture upload/remove (admin only).
- `components/`: `EventsView` (client: tiles, month view, archive), `SeasonPhases`,
  `EventFormFields`, `CoverEditor` and `BlocksEditor` (client), `EventBody`.
- Shared: `src/lib/image-crop.ts` (crop / shrink in the browser), `src/lib/image-type.ts`
  (format check by magic bytes), `src/lib/storage-url.ts`.

## Not yet (roadmap R2 / later)

- Discord announcement of new events: later, through a **separate webhook and channel** (owner,
  2026-11-03), not the Időpontfoglaló's.
- Events in the subscribable calendar feed (`/api/calendar`), event tiles on Hírek.
- News pages (the other half of R2) can reuse the content blocks.
