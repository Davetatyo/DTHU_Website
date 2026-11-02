// Pure rules of a ticket draw (no database). Unit-tested in draw.test.ts.

export type DrawEntry = { profileId: string; tickets: number };

/** Returns a whole number in [0, max). Production passes crypto.randomInt. */
export type RandomInt = (max: number) => number;

/**
 * Picks the winners of a draw. Every ticket is one entry, so a player with 3 tickets is three
 * times as likely to be picked as a player with 1. A player wins at most once: after a pick,
 * all their entries leave the pot. Returns profile ids in place order (1st place first).
 */
export function drawWinners(entries: DrawEntry[], winnerCount: number, randomInt: RandomInt): string[] {
  const pot = entries.filter((e) => e.tickets > 0).map((e) => ({ ...e }));
  const winners: string[] = [];
  while (winners.length < winnerCount && pot.length > 0) {
    const total = pot.reduce((n, e) => n + e.tickets, 0);
    let ticket = randomInt(total);
    const index = pot.findIndex((e) => (ticket -= e.tickets) < 0);
    winners.push(pot[index].profileId);
    pot.splice(index, 1);
  }
  return winners;
}

export function totalTickets(entries: DrawEntry[]): number {
  return entries.reduce((n, e) => n + e.tickets, 0);
}

/** Chance (0..1) that a player with `mine` of `total` tickets is picked first. */
export function firstPickChance(mine: number, total: number): number {
  return total > 0 ? mine / total : 0;
}

export type DrawPhase = "open" | "closing" | "drawn" | "cancelled";

/** "closing": the closing time has passed but the draw has not been held yet (next hourly run). */
export function drawPhase(draw: { status: string; closes_at: string }, now: Date = new Date()): DrawPhase {
  if (draw.status === "drawn") return "drawn";
  if (draw.status === "cancelled") return "cancelled";
  return new Date(draw.closes_at) <= now ? "closing" : "open";
}

/** How many more tickets a player may put into a draw (balance and per-player cap). */
export function maxEntry(balance: number, alreadyIn: number, cap: number | null): number {
  const room = cap == null ? Infinity : Math.max(0, cap - alreadyIn);
  return Math.max(0, Math.min(balance, room));
}

/** Parses a whole ticket amount typed into a form. `allowNegative` is for admin corrections. */
export function parseTicketAmount(raw: string, allowNegative = false): number | null {
  const text = raw.trim();
  if (!/^-?\d{1,4}$/.test(text)) return null;
  const n = Number(text);
  if (n === 0 || (!allowNegative && n < 0)) return null;
  return n;
}
