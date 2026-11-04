import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { getScheduledMatches } from "@/features/match-organizer/lib/data";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import { addLiveChannel, removeLiveChannel, startLiveMatch, stopLiveMatch } from "../actions/live";
import { getLiveCards, getLiveChannels, liveTablesExist } from "../lib/data";
import { LIVE_BANNER_ADMINS_ONLY } from "../lib/rules";

const STARTABLE_MS = 3 * 3600_000;

/** Admin page block: bot status, what is live, start or stop by hand, the tournament channels. */
export async function AdminLivePanel({ tournamentId, timeZone }: { tournamentId: string | null; timeZone: string }) {
  if (!(await liveTablesExist())) {
    return (
      <section className="card space-y-2">
        <h2 className="text-lg font-bold">Élő adás</h2>
        <p className="muted text-sm">Még nem futott le a 0011-es migráció, addig ez a funkció nem működik.</p>
      </section>
    );
  }

  const [channels, cards] = await Promise.all([getLiveChannels(), getLiveCards()]);
  const liveIds = new Set(cards.map((c) => c.matchId));
  const now = Date.now();
  const scheduled = tournamentId ? await getScheduledMatches(tournamentId, new Date(now - STARTABLE_MS)) : [];
  const startable = scheduled.filter(
    (m) => m.status === "confirmed" && !liveIds.has(m.id) && Date.parse(m.scheduled_at!) <= now + STARTABLE_MS,
  );
  const lastReport = channels.map((c) => c.last_report_at).filter(Boolean).sort().at(-1);

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-bold">
          Élő adás
          <InfoTip text="Ha egy meccs játékosa az időpont körül ±30 percben belép egy itt felsorolt hangcsatornába, a meccs legalább 1,5 órára felkerül az Élő adás sávra. Lejátszottnak jelöléskor vagy itt leállítva azonnal lekerül." />
        </h2>
        <p className="muted text-sm">
          {LIVE_BANNER_ADMINS_ONLY ? "Tesztüzem: egyelőre csak az adminok látják a sávot." : "A sávot minden bejelentkezett felhasználó látja."}{" "}
          Discord bot: {lastReport ? `utoljára jelentkezett ${formatDateTime(lastReport, timeZone)}` : "még nem jelentkezett"}.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Most élő</h3>
        {cards.length === 0 && <p className="muted text-sm">Most nincs élő meccs.</p>}
        {cards.map((card) => (
          <form key={card.matchId} action={stopLiveMatch} className="flex flex-wrap items-center justify-between gap-2">
            <input type="hidden" name="match_id" value={card.matchId} />
            <span className="text-sm">
              {card.tableNo}. asztal · {card.playerA}
              {card.playerB && <> – {card.playerB}</>}
              {card.channelName && <span className="muted"> · {card.channelName}</span>}
            </span>
            <SubmitButton className="btn btn-secondary btn-sm" confirm="Leállítod ennek a meccsnek az élő jelzését? A bot ezután nem indítja újra.">
              Leállítás
            </SubmitButton>
          </form>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">
          Indítás kézzel
          <InfoTip text="Tartalék arra az esetre, ha a bot nem érzékeli a játékosokat. A meccs legalább 1,5 órára felkerül a sávra." />
        </h3>
        {startable.length === 0 && <p className="muted text-sm">Nincs megerősített meccs a következő vagy az elmúlt 3 órában.</p>}
        {startable.map((m) => (
          <form key={m.id} action={startLiveMatch} className="flex flex-wrap items-center justify-between gap-2">
            <input type="hidden" name="match_id" value={m.id} />
            <span className="text-sm first-letter:uppercase">
              {formatDateTime(m.scheduled_at!, timeZone)} · {m.a.karnyx_name}
              {m.b && <> – {m.b.karnyx_name}</>}
            </span>
            <span className="flex flex-wrap gap-2">
              <select name="channel_id" className="input max-w-xs" aria-label="Csatorna" defaultValue={channels[0]?.discord_channel_id ?? ""}>
                <option value="">Nincs csatorna</option>
                {channels.map((c) => (
                  <option key={c.discord_channel_id} value={c.discord_channel_id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <SubmitButton className="btn btn-sm" confirm="Élőre állítod ezt a meccset? A sávot mindenki látni fogja, aki jogosult rá.">
                Élőre állítás
              </SubmitButton>
            </span>
          </form>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">
          Hangcsatornák
          <InfoTip text="A bot csak ezeket a csatornákat figyeli, és a sáv ezekre a linkekre visz. Több párhuzamos meccshez adj hozzá több csatornát. Csatorna meghívó link (discord.gg) azoknak is működik, akik még nincsenek a szerveren." />
        </h3>
        {channels.length === 0 && <p className="muted text-sm">Még nincs csatorna.</p>}
        {channels.map((c) => (
          <form key={c.discord_channel_id} action={removeLiveChannel} className="flex flex-wrap items-center justify-between gap-2">
            <input type="hidden" name="id" value={c.discord_channel_id} />
            <span className="min-w-0 text-sm" style={{ overflowWrap: "anywhere" }}>
              <b>{c.name}</b>
              <span className="muted"> · {c.join_url ?? "nincs link, a sáv a meccs oldalára visz"}</span>
            </span>
            <SubmitButton className="btn btn-secondary btn-sm" confirm={`Törlöd a(z) „${c.name}” csatornát?`}>
              Törlés
            </SubmitButton>
          </form>
        ))}
        <form action={addLiveChannel} className="flex flex-wrap gap-2">
          <input className="input max-w-xs" name="name" placeholder="Név, pl. Élő asztal 1" aria-label="Csatorna neve" required maxLength={60} />
          <input className="input max-w-xs" name="id" placeholder="Csatorna azonosító" aria-label="Csatorna azonosító" inputMode="numeric" required />
          <input className="input max-w-xs" name="join_url" type="url" placeholder="Link (discord.gg/…)" aria-label="Csatorna link" />
          <SubmitButton className="btn btn-secondary">Mentés</SubmitButton>
        </form>
      </div>
    </section>
  );
}
