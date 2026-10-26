# DT Meccsszervező

Match organizer for the Dice Throne online tournament. Karnyx keeps doing pairings and results;
this app helps players find their opponent (Karnyx ↔ Facebook ↔ Discord name), agree on a match
time, and shows everyone the schedule with calendar export. The UI is Hungarian.

**Stack:** Next.js 15 (TypeScript, Tailwind) on Vercel · Supabase (Postgres + Discord login) ·
Discord channel webhook · Supabase pg_cron for reminders.

## How it works

- **Admin** pastes a round copied from Karnyx at `/admin`. The preview shows the pairs
  (neighbours in the list play each other); starting the round closes the previous one,
  adds new players to the roster, and posts the pairings to Discord with @mentions.
- **Players** log in with Discord, pick their Karnyx name from the roster and enter their
  Facebook name. On their match page they propose 1–3 times; the opponent accepts one →
  confirmed, announced on Discord, addable to Google/Apple/Outlook calendars.
- **Players** click "Lejátszottuk" after the game. When every match in the round is played, the
  admin page marks the round complete and opens the next round's import.
- **Discord posts:** round start (pings everyone, Bye players on a "Pihen:" line), a short ping to
  the player who has to answer a time suggestion, confirmed times (no ping), the admin's manual
  "Emlékeztető", and one automatic warning 48 hours before the deadline (hourly check via Supabase)
  pinging players whose match has no agreed time.
- **Public schedule** at `/menetrend` with a subscribable calendar feed (`/api/calendar`,
  `?player=<Karnyx name>` for one player).

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) → Run.
3. **Project Settings → API**: copy the Project URL, `anon` key and `service_role` key.

### 2. Discord login

1. [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **OAuth2** → copy Client ID and Client Secret → add redirect
   `https://<your-project>.supabase.co/auth/v1/callback`.
3. Supabase → **Authentication → Sign In / Providers → Discord** → enable, paste ID and secret.
4. Supabase → **Authentication → URL Configuration**: Site URL = your app URL; add
   `http://localhost:3000/auth/callback` and `https://<your-app>.vercel.app/auth/callback`
   to Redirect URLs.

### 3. Discord channel webhook

Channel settings → **Integrations → Webhooks → New Webhook** → Copy Webhook URL.

### 4. Run locally

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev
```

Your Discord username in `BOOTSTRAP_ADMIN_DISCORD` becomes admin on first login. Promote others
at `/admin` by Discord or Karnyx name.

### 5. Deploy to Vercel

Push the repo to GitHub, import it in Vercel, add every variable from `.env.example` under
**Settings → Environment Variables**. The app takes its own address from the domain visitors open,
so `NEXT_PUBLIC_SITE_URL` is optional. A custom domain can be added later in Vercel; then add it to
the Supabase URL settings (Site URL and `…/auth/callback` redirect).

### 6. Reminders

Supabase → **Database → Extensions**: enable `pg_cron` and `pg_net`. Then in the SQL Editor:

```sql
select cron.schedule('dt-reminders', '0 * * * *', $$
  select net.http_get(
    url := 'https://YOUR-APP.vercel.app/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
  );
$$);
```

## Running a tournament

1. `/admin` → **Új verseny indítása** (new tournament).
2. In Karnyx, select the round's pairings (hero avatars + names), copy, paste into
   **Új forduló párosítása**, check the preview, set the deadline (default 7 days), start.
3. Wrong paste? **Forduló törlése** deletes the latest round and reopens the previous one.
4. Someone claimed the wrong Karnyx name? **Név felszabadítása** in the user list.

## Development

```bash
npm test        # parser, time zone, calendar and Discord helpers
npm run lint
npm run build
```

Security model: the browser never writes to the database. All writes go through server actions
using the service-role key after checking the player/admin permission
([src/lib/auth.ts](src/lib/auth.ts)). Row Level Security lets the public read tournament data;
profiles (Facebook/Discord names) are only readable by signed-in users.
