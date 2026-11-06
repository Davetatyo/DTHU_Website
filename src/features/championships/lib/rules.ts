import { createRng, defaultSwissRounds, shuffle, standings } from "./engine";
import type { MatchResult, Participant, Standing } from "./engine/types";
import type { ChampionshipMatch, Player, Registration, Round, ChampionshipFormat, ChampionshipSettings, ChampionshipStatus } from "./types";

export const HEROES_PER_PLAYER = 3;
const DEFAULT_ROUND_DAYS = 7;

export const FORMAT_LABELS: Record<ChampionshipFormat, string> = {
  swiss: "Svájci",
  round_robin: "Körmérkőzés",
  single_elimination: "Egyenes kiesés",
  double_elimination: "Dupla kiesés",
  groups_playoffs: "Csoportkör + rájátszás",
};

/** Formats the web can already pair end to end; the others are listed as coming soon. */
export const PLAYABLE_FORMATS: readonly ChampionshipFormat[] = ["swiss"];

export const STATUS_LABELS: Record<ChampionshipStatus, string> = {
  draft: "Előkészítés",
  registration: "Jelentkezés nyitva",
  running: "Folyamatban",
  finished: "Véget ért",
};

type HeroPickResult = { ok: true; heroes: string[] } | { ok: false; error: string };

/** Exactly 3 different heroes, each from the allowed list. */
export function validateHeroPicks(picks: string[], allowed: readonly string[]): HeroPickResult {
  const heroes = picks.map((h) => h.trim()).filter(Boolean);
  if (heroes.length !== HEROES_PER_PLAYER) return { ok: false, error: `Válassz pontosan ${HEROES_PER_PLAYER} hőst.` };
  const known = new Set(allowed);
  const unknown = heroes.find((h) => !known.has(h));
  if (unknown) return { ok: false, error: `Ismeretlen hős: ${unknown}.` };
  if (new Set(heroes).size !== heroes.length) return { ok: false, error: "Mindhárom hős legyen különböző." };
  return { ok: true, heroes };
}

/** Registration is open and its start time has passed. */
export function isStartDue(t: { status?: ChampionshipStatus; starts_at?: string | null }, now: Date): boolean {
  return t.status === "registration" && !!t.starts_at && new Date(t.starts_at).getTime() <= now.getTime();
}

/** Why a player can't change their entry right now, or null when they can. */
export function registrationBlocker(status: ChampionshipStatus | undefined, reg: Registration | null): string | null {
  if (status !== "registration") return "A jelentkezés lezárult.";
  if (reg?.locked_at) return "Véglegesítetted a jelentkezésed, már nem módosítható.";
  return null;
}

export function swissRoundCount(settings: ChampionshipSettings, playerCount: number): number {
  return settings.rounds ?? defaultSwissRounds(playerCount);
}

/** What happens once every match of the latest round has a result. */
export function stepAfterCompletedRound(
  t: { format?: ChampionshipFormat; auto_pairing?: boolean; settings?: ChampionshipSettings },
  roundsPlayed: number,
  playerCount: number,
): "finish" | "next_round" | "wait" {
  if (t.format !== "swiss") return "wait";
  if (roundsPlayed >= swissRoundCount(t.settings ?? {}, playerCount)) return "finish";
  return t.auto_pairing ? "next_round" : "wait";
}

/**
 * A match counts as decided only with a confirmed result (a winner or a draw); "Lejátszottuk"
 * alone doesn't decide it.
 */
export function isDecided(m: {
  status: string;
  winner_id?: string | null;
  is_draw?: boolean | null;
  player_b_id: string | null;
}): boolean {
  return m.status === "bye" || !m.player_b_id || !!m.winner_id || !!m.is_draw;
}

export function matchHistory(rounds: Pick<Round, "id" | "number">[], matches: ChampionshipMatch[]): MatchResult[] {
  const numberOf = new Map(rounds.map((r) => [r.id, r.number]));
  return matches.map((m) => ({
    round: numberOf.get(m.round_id) ?? 1,
    p1: m.player_a_id,
    p2: m.player_b_id,
    winner: m.winner_id ?? null,
    status: !m.player_b_id || m.status === "bye" ? "bye" : m.winner_id ? "played" : m.is_draw ? "draw" : "pending",
  }));
}

/** Stable seeds: shuffled once per tournament, the same every round. */
export function seededParticipants(tournamentId: string, players: Pick<Player, "id">[]): Participant[] {
  const ordered = players.slice().sort((a, b) => a.id.localeCompare(b.id));
  return shuffle(ordered, createRng(tournamentId)).map((p, i) => ({ id: p.id, seed: i + 1 }));
}

export function tournamentStandings(
  tournamentId: string,
  players: Pick<Player, "id">[],
  rounds: Pick<Round, "id" | "number">[],
  matches: ChampionshipMatch[],
): Standing[] {
  return standings(seededParticipants(tournamentId, players), matchHistory(rounds, matches));
}

export function roundDeadline(settings: ChampionshipSettings, from: Date): Date {
  const days = settings.round_days && settings.round_days > 0 ? settings.round_days : DEFAULT_ROUND_DAYS;
  return new Date(from.getTime() + days * 24 * 3600_000);
}
