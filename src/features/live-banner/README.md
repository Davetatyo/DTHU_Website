# Live banner (Élő adás)

A blinking "Élő adás" card at the top of the page when a tournament match is being played. Clicking
it opens the Discord voice channel of the game. Several games at once get one card each.

**Status (2026-11-04):** website side built, on `feature/live-banner`. It can't detect anything until
Árpád merges the reporter into his Discord bot: [bot/README.md](bot/README.md). The admin's manual
start works without the bot.

## Rules (owner, 2026-11-04)

| Question | Decision | Where |
|---|---|---|
| What starts it | One player of a confirmed match in a tournament voice channel, from 30 min before to 30 min after the match time | `decideLiveWrites` in `lib/rules.ts` |
| How long it stays on | At least 1.5 hours, and longer while one of the match's players is still in a channel | `liveEndsAt` |
| What ends it early | Marking the match played, or an admin's Leállítás | `lib/data.ts`, `isLive` |
| Who sees it | Logged-in users. **Now only admins**, until `LIVE_BANNER_ADMINS_ONLY` in `lib/rules.ts` is set to false | `canSeeLiveBanner` |

Two readings of the owner's words worth checking when he tests it:

- He said "1.5 hour or at least until everyone leaves". Built as the *longer* of the two. So a game
  over in 30 minutes stays on the banner until 1.5 hours unless someone presses Lejátszottuk. To
  end it as soon as everyone has left instead, change `liveEndsAt` and its tests.
- "Everyone" means the match's two players, not spectators. Otherwise someone lingering in the
  channel, or the next match's players arriving early, would keep the finished match live.

## How it works

1. The Discord bot posts who is in the tournament channels to `POST /api/live/voice`
   (`app/api/live/voice/route.ts` → `lib/report.ts`), on every change and once a minute.
2. `lib/rules.ts` decides, as pure logic with tests, which matches start or stay live, and
   `lib/report.ts` writes that to `match_live`.
3. `LiveBanner` in the layouts reads what is live now. `LiveBannerCards` refreshes every 45 seconds
   from `GET /api/live/now`, so a game appears on an open page.

Nothing switches the banner off: whether a match is live is worked out each time it's read. If the
bot stops, matches simply end by the same rule.

## Data

Migration `supabase/migrations/0011_live_banner.sql`: `live_channels` (tournament channels, edited
on the admin page) and `match_live` (matches that went live). Only the server can read them. Env:
`LIVE_BOT_SECRET` in Vercel and on the bot.

## Admin

Admin felület → Élő adás: when the bot last checked in, what is live (Leállítás), Indítás kézzel, and
the channel list. A channel link can be a `discord.com/channels/…` link or a `discord.gg` invite.

## Open questions

- **Which link works best on phones?** Not tested yet, especially from the Facebook app. A channel
  invite (`discord.gg`) should also work for people not yet on the server. Try both on a real phone.
- **What Discord does in the voice channel after the click.** It can open the channel, not join the
  viewer to the call.
