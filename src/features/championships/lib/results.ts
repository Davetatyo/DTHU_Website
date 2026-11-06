import type { MatchReport, ReportOutcome } from "./types";

// Result reports: one player submits (winner, final health, picks and bans), the opponent
// confirms. If the opponent disagrees they correct it, and the correction waits for the first
// player. A confirmed result is locked; only admins can change it, and an admin's report is
// locked right away. Pure rules here, the database side is in actions/results.ts.

const MAX_HP = 99;

export type ReportFields = Pick<MatchReport, "outcome" | "hp_a" | "hp_b" | "pick_a" | "pick_b" | "ban_a" | "ban_b">;

export type ReportInput = {
  outcome: string;
  hp_a: string;
  hp_b: string;
  pick_a: string;
  pick_b: string;
  ban_a: string;
  ban_b: string;
};

type Actor = { side: "a" | "b" | null; admin: boolean };

type ReportStatus = "none" | "pending" | "locked";

export function reportStatus(report: Pick<MatchReport, "confirmed_at"> | null): ReportStatus {
  if (!report) return "none";
  return report.confirmed_at ? "locked" : "pending";
}

/**
 * What the viewer may do with a match's report. A player of the match acts as a player until the
 * result is locked (even if they are an admin, so nobody locks their own result alone); after
 * that, and on other people's matches, admins can change it and their change locks.
 */
export function reportRights(
  report: Pick<MatchReport, "submitted_side" | "confirmed_at"> | null,
  actor: Actor,
): { canSubmit: boolean; canConfirm: boolean; locksOnSubmit: boolean } {
  const status = reportStatus(report);
  if (actor.side && status !== "locked") {
    return { canSubmit: true, canConfirm: status === "pending" && report!.submitted_side !== actor.side, locksOnSubmit: false };
  }
  if (actor.admin) return { canSubmit: true, canConfirm: false, locksOnSubmit: true };
  return { canSubmit: false, canConfirm: false, locksOnSubmit: false };
}

function parseHp(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = Number(s);
  return n <= MAX_HP ? n : null;
}

/**
 * Checks a submitted form. Picks and bans come from each player's 3 heroes, and a player's
 * banned hero can't be the one they played. A winner can't finish on 0 health (both on 0 is a
 * draw); the loser may have health left (conceded game).
 */
export function validateReport(
  input: ReportInput,
  heroesA: readonly string[],
  heroesB: readonly string[],
): { ok: true; report: ReportFields } | { ok: false; error: string } {
  const outcome = input.outcome as ReportOutcome;
  if (!["a", "b", "draw"].includes(outcome)) return { ok: false, error: "Válaszd ki a győztest vagy a döntetlent." };

  const hp_a = parseHp(input.hp_a);
  const hp_b = parseHp(input.hp_b);
  if (hp_a === null || hp_b === null) return { ok: false, error: `Az életerő 0 és ${MAX_HP} közötti egész szám legyen.` };
  if ((outcome === "a" && hp_a === 0) || (outcome === "b" && hp_b === 0)) {
    return { ok: false, error: "A győztes nem végezhet 0 életerővel. Ha mindketten 0-n álltok, az döntetlen." };
  }

  const sides = [
    { label: "A", heroes: heroesA, pick: input.pick_a.trim(), ban: input.ban_a.trim() },
    { label: "B", heroes: heroesB, pick: input.pick_b.trim(), ban: input.ban_b.trim() },
  ];
  for (const s of sides) {
    if (s.heroes.length === 0) continue;
    if (!s.heroes.includes(s.pick) || !s.heroes.includes(s.ban)) {
      return { ok: false, error: "Mindkét játékosnál jelöld be a választott és a kitiltott hőst." };
    }
    if (s.pick === s.ban) return { ok: false, error: "A kitiltott hőssel nem lehetett játszani: a választott és a kitiltott hős legyen különböző." };
  }

  return {
    ok: true,
    report: {
      outcome,
      hp_a,
      hp_b,
      pick_a: sides[0].pick || null,
      pick_b: sides[1].pick || null,
      ban_a: sides[0].ban || null,
      ban_b: sides[1].ban || null,
    },
  };
}

/** The same result as an existing report (submitting it again counts as confirming). */
export function sameReport(a: ReportFields, b: ReportFields): boolean {
  return (
    a.outcome === b.outcome &&
    a.hp_a === b.hp_a &&
    a.hp_b === b.hp_b &&
    a.pick_a === b.pick_a &&
    a.pick_b === b.pick_b &&
    a.ban_a === b.ban_a &&
    a.ban_b === b.ban_b
  );
}

/** The match columns a locked result sets. */
export function matchResultColumns(
  outcome: ReportOutcome,
  match: { player_a_id: string; player_b_id: string | null },
): { winner_id: string | null; is_draw: boolean } {
  if (outcome === "draw") return { winner_id: null, is_draw: true };
  return { winner_id: outcome === "a" ? match.player_a_id : match.player_b_id, is_draw: false };
}

/** Text of the button that opens the result panel. */
export function resultButtonLabel(status: ReportStatus, rights: { canConfirm: boolean; locksOnSubmit: boolean }): string {
  if (rights.canConfirm) return "Eredmény jóváhagyása";
  if (status === "locked") return "Eredmény módosítása";
  if (status === "pending") return rights.locksOnSubmit ? "Eredmény rögzítése" : "Beküldött eredmény";
  return rights.locksOnSubmit ? "Eredmény rögzítése" : "Eredmény beküldése";
}
