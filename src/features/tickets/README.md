# Sorsolás (ticket draws)

| | |
|---|---|
| Folder | `src/features/tickets/` (id stays `tickets`) |
| Branch | `feature/tickets` |
| Route | `/sorsolas` (player page), `/sorsolas/admin` (admins). Old `/jegyek` redirects. Pages in `src/app/(site)/sorsolas/` |
| Status | **preview**: admins only until the full site opens (keep in sync with `src/features/registry.ts` and STATE.md) |
| Database | `supabase/migrations/0008_ticket_draws.sql` (**must be run by the owner before deploy**) |

## What it is

Players collect **tickets** (jegyek): podium places at online or live tournaments, live events,
helping organise, or anything an admin decides. During the year admins open **draws**
(sorsolások). A player enters a draw with as many tickets as they want (1 ticket = 1 entry, so
more tickets = better chance). At the closing time entries stop automatically and the winners
are drawn at random.

## Rules (built this way, confirm with the owner)

- **Earning:** admins book tickets on `/sorsolas/admin`: the "Dobogó" form (1st/2nd/3rd of a
  tournament, defaults +3/+2/+1, agreed 2026-11-02) or a single +/− booking with a reason. Nothing is automatic
  yet, since results live in Karnyx. Tickets belong to a **profile** (Discord login), so a
  player must log in once before they can receive tickets.
- **Balance** = sum of the ledger (`ticket_ledger`). Players see only their balance; the
  history (who got or spent what, when) is shown to admins only, on `/sorsolas/admin`. Rows are never edited; corrections are
  negative bookings. The balance can never go below zero (checked in the database).
- **Entering:** signed-in players on `/sorsolas`, any number of tickets up to their balance and
  the draw's optional per-player cap; they can add more later. Spent tickets are gone, unless
  the admin cancels the draw ("Elmarad"), which refunds everyone.
- **Closing and drawing:** at `closes_at` the database refuses new entries. The hourly cron
  (`/api/cron/reminders`, already scheduled in Supabase) then holds every closed draw; an
  admin can also press "Sorsolás most" (closes and draws immediately). The result is posted
  to Discord (winners pinged if logged in) and shown on the page.
- **Randomness:** `lib/draw.ts` `drawWinners` with Node's `crypto.randomInt`: ticket-weighted,
  each player wins at most once, winners in place order. The database function
  `ticket_draw_complete` accepts only the first result and checks the entries didn't change.

## Code

```
lib/draw.ts       pure rules: drawWinners, drawPhase, maxEntry, parseTicketAmount (tested)
lib/data.ts       reads (service client); TicketsNotReady when migration 0008 is missing
lib/stats.ts      per-draw stats for the cards
lib/run.ts        holdDraw / runDueDraws (cron + admin button), Discord announcement
lib/errors.ts     database error codes → Hungarian messages
actions/draws.ts  enterDraw (players); awardTickets, awardPodium, createDraw, drawNow, cancelDraw (admins)
components/       DrawCard, LedgerList
data/earn.ts      "Így szerzel jegyet" tiles (prototype values)
```

## Open questions (ask the owner)

- Other ways to earn later (played/won matches, live events, helping organise)? Agreed
  2026-11-02: for now **only podium places** (1st +3, 2nd +2, 3rd +1), `data/earn.ts`.
- Do tickets expire (e.g. at season end)?
- Should players see each other's balances / a ticket leaderboard?
- The Bolt (shop) can later spend tickets through the same ledger (new `kind`).
