# DTHU – Dice Throne Hungary

The website of the Hungarian Dice Throne community: https://dthu.hu

It starts with the **Meccsszervező** (match organizer, `/meccsszervezo`): players find their
online tournament opponent (Karnyx ↔ Facebook ↔ Discord name), agree on a match time, and
everyone sees the schedule with calendar export. Karnyx keeps doing pairings and results.
News, rankings, tournament calendar, tickets, shop, rulebook and the Alchemist help chat
follow as separate features (see [STATE.md](STATE.md)).

**Stack:** Next.js 15 on Vercel · Supabase (Postgres + Discord login) · Discord webhook ·
Supabase pg_cron for reminders.

## Docs

| File | What it's for |
|---|---|
| [CLAUDE.md](CLAUDE.md) | How to work on the project: rules, project map, features and branches, handover |
| [STATE.md](STATE.md) | Where things stand: version, launch plan, features, owner tasks, issues, changelog |
| [docs/match-organizer.md](docs/match-organizer.md) | The Meccsszervező: architecture, data model, domain rules |
| [docs/setup.md](docs/setup.md) | Services, environment variables, Supabase / Discord / cron setup |
| [reference/](reference/README.md) | The design prototype the site follows |

## Quick start

```bash
cp .env.example .env.local   # fill in the values (ask the owner)
npm install
npm run dev                  # http://localhost:3000
npm test
```

Local development uses the **production** database: read [CLAUDE.md](CLAUDE.md) first.

History: the Meccsszervező started as its own repository
(github.com/Davetatyo/DT_Match_Organizer, v1.0–v1.2); its full history continues here.
