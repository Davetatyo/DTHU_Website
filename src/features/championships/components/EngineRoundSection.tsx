import { SubmitButton } from "@/components/SubmitButton";
import { InfoTip } from "@/components/InfoTip";
import { generateEngineRound } from "@/features/championships/actions/admin";
import { utcToWallTime, formatDateTime } from "@/features/match-organizer/lib/time";
import { isDecided, roundDeadline, scoringLabel, scoringOf, swissRoundCount, tournamentStandings } from "@/features/championships/lib/rules";
import type { Championship, ChampionshipMatch, Player, Round } from "@/features/championships/lib/types";
import { getMatchReports } from "@/features/championships/lib/run";
import { RoundPairings } from "./RoundPairings";
import { StandingsTable } from "./StandingsTable";

/** Admin view of a running or finished championship: current round, results, standings. */
export async function EngineRoundSection({
  tournament,
  players,
  rounds,
  allMatches,
  tz,
  back,
}: {
  tournament: Championship;
  players: Player[];
  rounds: Round[];
  allMatches: ChampionshipMatch[];
  tz: string;
  back: string;
}) {
  const current = rounds[0] ?? null;
  const currentMatches = current ? allMatches.filter((m) => m.round_id === current.id).sort((a, b) => a.table_no - b.table_no) : [];
  const currentDone = !!current && currentMatches.every(isDecided);
  const maxRounds = swissRoundCount(tournament.settings, players.length);
  const canGenerate = tournament.status === "running" && (!current || currentDone) && rounds.length < maxRounds;
  const nameOf = new Map(players.map((p) => [p.id, p.karnyx_name]));
  const reports = await getMatchReports(allMatches.map((m) => m.id));
  const table = tournamentStandings(tournament, players, rounds, allMatches, reports);

  return (
    <div className="space-y-6">
      {current && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">
              {current.number}. forduló <span className="muted text-sm font-normal">/ {maxRounds}</span>
            </h2>
            <span className="muted text-sm">Határidő: {formatDateTime(current.deadline, tz)}</span>
          </div>
          {currentDone ? (
            <p className="badge badge-confirmed">Minden eredmény megvan</p>
          ) : (
            <p className="muted text-sm">
              Az eredményt a játékosok küldik be és hagyják jóvá; adminként bármelyiket rögzítheted vagy javíthatod, ez azonnal
              végleges.
              {tournament.auto_pairing && " Az utolsó végleges eredmény után a következő forduló magától elindul."}
            </p>
          )}
          <RoundPairings matches={currentMatches} reports={reports} timeZone={tz} adminView back={back} />
        </section>
      )}

      {canGenerate && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">{(current?.number ?? 0) + 1}. forduló párosítása</h2>
          <form action={generateEngineRound} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="slug" value={tournament.slug} />
            <div>
              <label className="label" htmlFor="engine-deadline">
                Határidő
                <InfoTip text="Eddig kell lejátszani a forduló meccseit. Később a fő admin oldalon módosítható." />
              </label>
              <input
                id="engine-deadline"
                type="datetime-local"
                name="deadline"
                className="input"
                defaultValue={utcToWallTime(roundDeadline(tournament.settings, new Date()), tz)}
                required
              />
            </div>
            <SubmitButton confirm={`Elindítod a ${(current?.number ?? 0) + 1}. fordulót? A párosítás kimegy Discordra.`}>
              Párosítás és indítás
            </SubmitButton>
          </form>
        </section>
      )}

      {tournament.status === "finished" && (
        <section className="card">
          <h2 className="text-lg font-bold" style={{ color: "var(--ok)" }}>
            A verseny véget ért
          </h2>
          <p className="text-sm">
            Győztes: <strong>{table[0] ? nameOf.get(table[0].id) : "—"}</strong>
          </p>
        </section>
      )}

      {table.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">
            Állás
            <InfoTip text={`Pontozás: ${scoringLabel(scoringOf(tournament.settings))}. Sorrend: pont, Buchholz (az összes ellenfél pontjainak összege), életerő-különbség, egymás elleni eredmény.`} />
          </h2>
          <StandingsTable standings={table} nameMap={nameOf} scoringText={scoringLabel(scoringOf(tournament.settings))} showTiebreaks />
        </section>
      )}
    </div>
  );
}
