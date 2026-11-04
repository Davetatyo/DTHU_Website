# Live banner: what the Discord bot has to do

For Árpád, to merge into the DTHU server's bot. Decided by Dave on 2026-11-04: **no second bot**,
this goes into yours. The website side is already built. The bot only has one job:

> Tell the website who is in the tournament voice channels, whenever that changes and once a
> minute.

The website does everything else: which matches are live, the banner, the rules, the channel list.
Nothing about matches or channels needs configuring in the bot.

```
Players join voice ──▶ Your bot ──POST /api/live/voice──▶ dthu.hu ──▶ "Élő adás" banner
                              ◀── reply: channels to watch ──
```

## If your bot uses discord.js (5 minutes)

1. Copy [`live-voice-reporter.ts`](live-voice-reporter.ts) into the bot. It has no dependencies. If
   the bot is plain JavaScript, delete the types or run it through `tsc`.
2. Make sure the client has the `Guilds` and `GuildVoiceStates` intents. Neither is privileged.
3. Add this next to your client setup:

```ts
import { Events } from "discord.js";
import { createLiveVoiceReporter } from "./live-voice-reporter";

const GUILD_ID = process.env.DISCORD_GUILD_ID!; // the DTHU server

const liveReporter = createLiveVoiceReporter({
  endpoint: "https://dthu.hu/api/live/voice",
  secret: process.env.LIVE_BOT_SECRET!,
  listVoiceMembers: (channelId) =>
    client.guilds.cache.get(GUILD_ID)?.voiceStates.cache.filter((state) => state.channelId === channelId).map((state) => state.id) ?? [],
  onError: (error) => console.error("Live banner report failed:", error),
});

client.once(Events.ClientReady, () => liveReporter.start());
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (newState.guild.id === GUILD_ID) liveReporter.notifyVoiceChange(oldState.channelId, newState.channelId);
});
```

4. Set `LIVE_BOT_SECRET` and `DISCORD_GUILD_ID` in the bot's environment. Dave gives you the
   secret privately. It's the same value as `LIVE_BOT_SECRET` in Vercel. Never commit it.
5. Make sure the bot can see the tournament voice channels (View Channel).

This snippet is compile-checked against discord.js 14.28, but it has not run on a real server yet.
The reporter file itself has unit tests next to it.

## If your bot uses another language

It's one HTTP call. Implement these four rules:

1. **When the bot is ready**, call the endpoint with `{"channels": []}`. The reply lists the channels
   to watch.
2. **Once a minute**, send who is in each of those channels. Never skip this, even if nothing
   changed: it is how the website knows the bot is alive.
3. **When someone joins or leaves a watched channel**, send the same report. Wait about 2 seconds
   first, so several people moving at once make one report.
4. **After every reply**, replace your watch list with the reply's `watch`. If it has a new channel,
   report again straight away.

## The contract

```http
POST https://dthu.hu/api/live/voice
Authorization: Bearer <LIVE_BOT_SECRET>
Content-Type: application/json

{
  "channels": [
    { "id": "111111111111111111", "userIds": ["333333333333333333", "444444444444444444"] },
    { "id": "222222222222222222", "userIds": [] }
  ]
}
```

- `id` and `userIds` are Discord IDs, always strings. Numbers lose precision.
- `userIds` is everyone in that channel. You don't need to filter out bots or non-players, because
  the website only looks for players who have a match. Only send the channels in `watch`.
- Each report is the full current picture, not a change. That means a missed report or a bot restart
  fixes itself at the next one.

| Reply | Meaning | What the bot does |
|---|---|---|
| `200 {"watch": ["111…", "222…"]}` | Accepted. These are the channels to report on. | Replaces its watch list |
| `400` | The body isn't a valid report | Log it, this is a bug |
| `401` | Wrong or missing secret | Log it, check `LIVE_BOT_SECRET` on both sides |
| `503` | The website's database isn't ready (usually migration 0011 hasn't run) | Keep trying once a minute |

If the website is down, just keep going. The reporter file already does this.

## How to test

**1. The secret and endpoint, without Discord.** An empty report can't make anything go live. It
only records that the bot checked in:

```bash
curl -i -X POST https://dthu.hu/api/live/voice -H "Authorization: Bearer $LIVE_BOT_SECRET" -H "Content-Type: application/json" -d '{"channels":[]}'
```

You should get `200` and the channel list. Admin felület → Élő adás then shows when the bot last
checked in.

**2. The whole thing, with Dave:**

1. Dave adds a voice channel on the admin page.
2. Start the bot. "Discord bot: utoljára jelentkezett …" should update within a minute.
3. A player with a confirmed match joins that channel within 30 minutes of the match time.
4. The banner appears for admins within about a minute. While the banner is in its test phase,
   players don't see it.
5. Dave can remove a test from the banner with **Leállítás** on the same admin block.

This uses the live database, so test with a match you've agreed with Dave.

## Good to know

- **Why the bot reports instead of the website asking:** your bot is already connected to Discord, so
  it sees voice changes instantly. This replaces the once-a-minute check from the first plan.
- **Secret:** `LIVE_BOT_SECRET` can only report voice presence, nothing else. If it ever leaks, change
  it in Vercel and on the bot.
- **Privacy:** the bot only sends IDs from the channels in `watch`, never the rest of the server.
- **What makes a match live:** see [`../lib/rules.ts`](../lib/rules.ts) and its tests. You shouldn't
  need to change it for the bot.
