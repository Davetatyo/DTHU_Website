// Economy settings (DTHU_COINS_SPEC.md §2): every number admins can change. Stored in the
// economy_config table (migration 0010); a missing key means the default below. Pure: no
// database here (the loader is economy-store.ts), so it is unit-tested in economy.test.ts.

import type { RandomInt } from "@/features/tickets/lib/draw";

export type SpinPrize = { label: string; /** Percent, up to 2 decimals. */ chance: number; coins: number };

export type QuestionType = "trivia" | "rules" | "champion_zoom" | "ability_card" | "puzzle" | "community";

export type Economy = {
  ticketPrice: number;
  dailyRewardNormal: number;
  dailyRewardHard: number;
  streakLengthDays: number;
  streakBonusCoins: number;
  maxSpinEv: number;
  dailyFallbackEnabled: boolean;
  spinTable: SpinPrize[];
  /** Preferred question type per weekday, index 0 = Monday … 6 = Sunday. */
  dailyTypeSchedule: QuestionType[];
};

export const QUESTION_TYPES: QuestionType[] = ["trivia", "rules", "champion_zoom", "ability_card", "puzzle", "community"];

/** Hungarian names of the question types (admin forms and the quiz card). */
export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  trivia: "Dice Throne kvíz",
  rules: "Szabálykérdés",
  champion_zoom: "Kinek a képe? (hamarosan)",
  ability_card: "Melyik képesség / lap?",
  puzzle: "Kockarejtvény",
  community: "Közösségi kérdés",
};

export const DEFAULT_ECONOMY: Economy = {
  ticketPrice: 3500,
  dailyRewardNormal: 1,
  dailyRewardHard: 2,
  streakLengthDays: 7,
  streakBonusCoins: 2,
  maxSpinEv: 1,
  dailyFallbackEnabled: true,
  spinTable: [
    { label: "Semmi", chance: 52, coins: 0 },
    { label: "Kicsi", chance: 31, coins: 1 },
    { label: "Kicsi+", chance: 12, coins: 2 },
    { label: "Közepes", chance: 3.5, coins: 3 },
    { label: "Szép", chance: 1.2, coins: 5 },
    { label: "Főnyeremény", chance: 0.3, coins: 15 },
  ],
  dailyTypeSchedule: ["champion_zoom", "trivia", "rules", "ability_card", "puzzle", "community", "community"],
};

/** economy_config keys (spec names) → Economy fields. */
export const CONFIG_KEYS = {
  ticketPrice: "ticket_price",
  dailyRewardNormal: "daily_game_reward_normal",
  dailyRewardHard: "daily_game_reward_hard",
  streakLengthDays: "streak_length_days",
  streakBonusCoins: "streak_bonus_coins",
  maxSpinEv: "max_spin_ev",
  dailyFallbackEnabled: "daily_fallback_enabled",
  spinTable: "spin_table",
  dailyTypeSchedule: "daily_type_schedule",
} as const satisfies Record<keyof Economy, string>;

const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;

/** Builds the settings from stored rows, falling back to the default for any missing or broken value. */
export function economyFromRows(rows: { key: string; value: unknown }[]): Economy {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const get = <K extends keyof Economy>(field: K, parse: (v: unknown) => Economy[K] | null): Economy[K] => {
    const raw = byKey.get(CONFIG_KEYS[field]);
    return (raw === undefined ? null : parse(raw)) ?? DEFAULT_ECONOMY[field];
  };
  return {
    ticketPrice: get("ticketPrice", (v) => int(v, 1, 10_000_000)),
    dailyRewardNormal: get("dailyRewardNormal", (v) => int(v, 0, 100_000)),
    dailyRewardHard: get("dailyRewardHard", (v) => int(v, 0, 100_000)),
    streakLengthDays: get("streakLengthDays", (v) => int(v, 1, 365)),
    streakBonusCoins: get("streakBonusCoins", (v) => int(v, 0, 100_000)),
    maxSpinEv: get("maxSpinEv", (v) => (typeof v === "number" && v >= 0 && v <= 100_000 ? v : null)),
    dailyFallbackEnabled: get("dailyFallbackEnabled", (v) => (typeof v === "boolean" ? v : null)),
    spinTable: get("spinTable", (v) => (spinTableProblems(v as SpinPrize[]).length === 0 ? (v as SpinPrize[]) : null)),
    dailyTypeSchedule: get("dailyTypeSchedule", (v) =>
      Array.isArray(v) && v.length === 7 && v.every((t) => QUESTION_TYPES.includes(t)) ? (v as QuestionType[]) : null,
    ),
  };
}

/** Chance in hundredths of a percent (an integer), so the sum check is exact. */
export const basisPoints = (chance: number) => Math.round(chance * 100);

/** What's wrong with a spin table (Hungarian, for the admin form); empty = valid. */
export function spinTableProblems(table: SpinPrize[] | unknown): string[] {
  if (!Array.isArray(table) || table.length < 2 || table.length > 12) return ["A keréknek 2–12 mezője lehet."];
  const problems: string[] = [];
  table.forEach((p: SpinPrize, i) => {
    const n = i + 1;
    if (!p || typeof p.label !== "string" || !p.label.trim() || p.label.length > 40) problems.push(`${n}. mező: adj neki nevet (max. 40 karakter).`);
    if (typeof p?.chance !== "number" || !(p.chance > 0) || p.chance > 100 || Math.abs(p.chance * 100 - basisPoints(p.chance)) > 1e-6)
      problems.push(`${n}. mező: az esély 0 és 100 közötti szám legyen, legfeljebb 2 tizedessel.`);
    if (int(p?.coins, 0, 100_000) === null) problems.push(`${n}. mező: a coin 0 vagy pozitív egész szám legyen.`);
  });
  if (problems.length === 0) {
    const sum = table.reduce((n: number, p: SpinPrize) => n + basisPoints(p.chance), 0);
    if (sum !== 10_000) problems.push(`Az esélyek összege ${(sum / 100).toLocaleString("hu-HU")}%, pontosan 100% kell.`);
  }
  return problems;
}

/** Expected coins per spin. */
export function spinEv(table: SpinPrize[]): number {
  return table.reduce((n, p) => n + (p.chance / 100) * p.coins, 0);
}

/** Draws one prize: each prize is as likely as its chance. Returns its index in the table. */
export function pickSpin(table: SpinPrize[], randomInt: RandomInt): number {
  let ticket = randomInt(10_000);
  for (let i = 0; i < table.length; i++) {
    ticket -= basisPoints(table[i].chance);
    if (ticket < 0) return i;
  }
  return table.length - 1; // unreachable for a valid table (chances sum to exactly 100%)
}

/** Coins for a correct answer to a question. */
export function questionReward(q: { difficulty: "normal" | "hard"; reward_override: number | null }, e: Economy): number {
  if (q.reward_override != null) return q.reward_override;
  return q.difficulty === "hard" ? e.dailyRewardHard : e.dailyRewardNormal;
}
