import { createAdminClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { getPlayers, getRounds } from "@/features/match-organizer/lib/data";
import { nextSwissRound } from "./engine";
import { notifyChampionshipRound } from "./notify";
import { isDecided, isStartDue, matchHistory, roundDeadline, seededParticipants, stepAfterCompletedRound } from "./rules";
import type { Championship, ChampionshipMatch, MatchReport, Registration, Round } from "./types";

// Server side of Bajnokságok: reads, start, round creation, auto-advance. Championships never set
// tournaments.is_active, so the Időpontfoglaló keeps showing only the Karnyx league; their
// matches still open on the Időpontfoglaló's match page for agreeing on a time.

const MATCH_SELECT =
  "*, a:players!matches_player_a_fkey(*), b:players!matches_player_b_fkey(*), round:rounds!inner(*)";

/** Every match of a championship, all rounds. */
export async function getChampionshipMatches(tournamentId: string): Promise<ChampionshipMatch[]> {
  const { data } = await createAdminClient()
    .from("matches")
    .select(MATCH_SELECT)
    .eq("round.tournament_id", tournamentId)
    .order("table_no");
  return (data ?? []) as ChampionshipMatch[];
}

/** Result reports of the given matches, by match id. */
export async function getMatchReports(matchIds: string[]): Promise<Map<string, MatchReport>> {
  const map = new Map<string, MatchReport>();
  if (matchIds.length === 0) return map;
  const { data } = await createAdminClient().from("match_reports").select("*").in("match_id", matchIds);
  for (const r of (data ?? []) as MatchReport[]) map.set(r.match_id, r);
  return map;
}

export async function getChampionships(opts: { includeDrafts: boolean }): Promise<Championship[]> {
  let query = createAdminClient().from("tournaments").select("*").neq("format", "manual").order("created_at", { ascending: false });
  if (!opts.includeDrafts) query = query.neq("status", "draft");
  const { data } = await query;
  return (data ?? []) as Championship[];
}

export async function getTournamentBySlug(slug: string): Promise<Championship | null> {
  const { data } = await createAdminClient().from("tournaments").select("*").eq("slug", slug).neq("format", "manual").maybeSingle();
  return (data as Championship | null) ?? null;
}

export async function getRegistrations(tournamentId: string): Promise<Registration[]> {
  const { data } = await createAdminClient()
    .from("tournament_registrations")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at");
  return (data ?? []) as Registration[];
}

/** Ids of the championships the profile signed up for (and so plays in, once started). */
export async function getMyChampionshipIds(profileId: string | null | undefined): Promise<Set<string>> {
  if (!profileId) return new Set();
  const { data } = await createAdminClient().from("tournament_registrations").select("tournament_id").eq("profile_id", profileId);
  return new Set((data ?? []).map((r) => r.tournament_id as string));
}

export async function getRegistrationCounts(tournamentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (tournamentIds.length === 0) return counts;
  const { data } = await createAdminClient().from("tournament_registrations").select("tournament_id").in("tournament_id", tournamentIds);
  for (const row of data ?? []) counts.set(row.tournament_id, (counts.get(row.tournament_id) ?? 0) + 1);
  return counts;
}

type RoundOutcome =
  | { ok: true; round: Round; matchCount: number; byes: number; warnings: string[] }
  | { ok: false; error: string };

/** Pairs and saves the next round. Safe to race: rounds are unique per (tournament, number). */
export async function createEngineRound(t: Championship, deadline: Date): Promise<RoundOutcome> {
  if (t.format !== "swiss") return { ok: false, error: "Ennek a formátumnak a párosítása még nem készült el." };

  const [players, rounds, matches] = await Promise.all([getPlayers(t.id), getRounds(t.id), getChampionshipMatches(t.id)]);
  if (players.length < 2) return { ok: false, error: "Legalább 2 játékos kell a párosításhoz." };

  const number = (rounds[0]?.number ?? 0) + 1;
  const { pairings, warnings } = nextSwissRound(seededParticipants(t.id, players), matchHistory(rounds, matches), {
    seed: `${t.id}-${number}`,
  });
  if (pairings.length === 0) return { ok: false, error: warnings[0] ?? "Nem sikerült párosítani." };

  const db = createAdminClient();
  const { data: round, error } = await db
    .from("rounds")
    .insert({ tournament_id: t.id, number, deadline: deadline.toISOString() })
    .select()
    .single();
  if (error || !round) return { ok: false, error: "Ez a forduló már létrejött, frissítsd az oldalt." };

  await db.from("rounds").update({ closed_at: new Date().toISOString() }).eq("tournament_id", t.id).is("closed_at", null).neq("id", round.id);

  // Pairings with a real opponent first, so table numbers match the Karnyx habit.
  const ordered = [...pairings.filter((p) => p.p2), ...pairings.filter((p) => !p.p2)];
  await db.from("matches").insert(
    ordered.map((p, i) => ({
      round_id: round.id,
      table_no: i + 1,
      player_a_id: p.p1,
      player_b_id: p.p2,
      status: p.p2 ? "pending" : "bye",
    })),
  );

  await notifyChampionshipRound(t, round as Round, await getSiteUrl());
  const byes = ordered.filter((p) => !p.p2).length;
  return { ok: true, round: round as Round, matchCount: ordered.length - byes, byes, warnings };
}

type StartOutcome = { ok: true; players: number; round: RoundOutcome | null } | { ok: false; error: string };

/**
 * Closes registration: every registered player is checked in with their heroes (locked or not),
 * and round 1 is paired when auto pairing is on. Only one caller wins the status claim.
 */
export async function startTournament(t: Championship): Promise<StartOutcome> {
  const registrations = await getRegistrations(t.id);
  if (registrations.length < 2) return { ok: false, error: "Legalább 2 jelentkező kell az indításhoz." };

  const db = createAdminClient();
  const { data: claimed } = await db
    .from("tournaments")
    .update({ status: "running" })
    .eq("id", t.id)
    .in("status", ["draft", "registration"])
    .select("id");
  if (!claimed?.length) return { ok: false, error: "A verseny már elindult." };

  const { error } = await db.from("players").insert(
    registrations.map((r) => ({ tournament_id: t.id, karnyx_name: r.karnyx_name, heroes: r.heroes })),
  );
  if (error) {
    await db.from("tournaments").update({ status: "registration" }).eq("id", t.id);
    return { ok: false, error: `A játékosok felvétele nem sikerült: ${error.message}` };
  }

  const running = { ...t, status: "running" as const };
  const round = t.auto_pairing ? await createEngineRound(running, roundDeadline(t.settings, new Date())) : null;
  return { ok: true, players: registrations.length, round };
}

/**
 * Starts every listed championship whose start time has passed. Returns true when one started:
 * the page should then redirect to itself, because Next.js reuses identical reads within one
 * render and would show the data as it was before the start.
 */
export async function startDue(championships: Championship[]): Promise<boolean> {
  let started = false;
  for (const t of championships) {
    if (isStartDue(t, new Date()) && (await startTournament(t)).ok) started = true;
  }
  return started;
}

/** Hourly cron backstop for tournaments nobody opened after their start time. */
export async function startDueTournaments(): Promise<number> {
  const { data } = await createAdminClient()
    .from("tournaments")
    .select("*")
    .eq("status", "registration")
    .lte("starts_at", new Date().toISOString());
  let started = 0;
  for (const t of (data ?? []) as Championship[]) {
    if ((await startTournament(t)).ok) started++;
  }
  return started;
}

/** After a result: finish the round when every match is decided, then pair or finish. */
export async function advanceAfterResult(roundId: string): Promise<string | null> {
  const db = createAdminClient();
  const { data: round } = await db.from("rounds").select("*").eq("id", roundId).maybeSingle();
  if (!round) return null;
  const { data: t } = await db.from("tournaments").select("*").eq("id", round.tournament_id).maybeSingle();
  if (!t || t.format === "manual" || t.status !== "running") return null;

  const { data: roundMatches } = await db.from("matches").select("status, winner_id, is_draw, player_b_id").eq("round_id", roundId);
  if (!(roundMatches ?? []).every(isDecided)) return null;

  await db.from("rounds").update({ completed_at: new Date().toISOString() }).eq("id", roundId).is("completed_at", null);

  const tournament = t as Championship;
  const [rounds, players] = await Promise.all([getRounds(tournament.id), getPlayers(tournament.id)]);
  if (rounds[0]?.id !== roundId) return null;

  const step = stepAfterCompletedRound(tournament, rounds.length, players.length);
  if (step === "finish") {
    await db.from("tournaments").update({ status: "finished" }).eq("id", tournament.id).eq("status", "running");
    return "Az utolsó forduló is lezárult, a verseny véget ért.";
  }
  if (step === "next_round") {
    const next = await createEngineRound(tournament, roundDeadline(tournament.settings, new Date()));
    return next.ok ? `A ${next.round.number}. forduló automatikusan elindult.` : null;
  }
  return null;
}
