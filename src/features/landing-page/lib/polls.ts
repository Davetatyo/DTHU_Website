// Szavazás (polls in news articles): closing, checking a vote, counting the results, and who may
// see them. Pure functions only (no database), unit-tested.
//
// Owner decisions (2026-11-03): logged-in users only, one vote per account, the vote can be
// changed until the poll closes; results show after voting (everyone once it's closed, admins
// always); votes are anonymous; "Egyéb" answers are shown publicly without names.

/** The choice id of "Egyéb" (the typed answer goes to other_text). */
export const OTHER = "_other";

export type PollOption = { id: string; label: string };

/** One row of public.polls (supabase/migrations/0005_polls.sql). */
export type PollRow = {
  id: string;
  news_id: string;
  question: string;
  options: PollOption[];
  multi: boolean;
  allow_other: boolean;
  closes_at: string;
};

export type Vote = { choices: string[]; other_text: string | null };

export function isClosed(poll: Pick<PollRow, "closes_at">, now: Date = new Date()): boolean {
  return new Date(poll.closes_at).getTime() <= now.getTime();
}

/** Results are shown once you've voted, to everyone after closing, and to admins always. */
export function canSeeResults(opts: { voted: boolean; closed: boolean; isAdmin: boolean }): boolean {
  return opts.voted || opts.closed || opts.isAdmin;
}

/**
 * Checks a vote against the poll: open, existing options, one choice for single-choice polls,
 * at least one for multi-choice, and an answer typed in when "Egyéb" is chosen.
 */
export function checkVote(
  poll: PollRow,
  choices: string[],
  otherText: string,
  now: Date = new Date(),
): { ok: true; vote: Vote } | { ok: false; error: string } {
  if (isClosed(poll, now)) return { ok: false, error: "A szavazás lezárult." };
  const valid = new Set([...poll.options.map((o) => o.id), ...(poll.allow_other ? [OTHER] : [])]);
  const picked = [...new Set(choices)].filter((c) => valid.has(c));
  if (picked.length !== new Set(choices).size) return { ok: false, error: "Ismeretlen válasz, töltsd újra az oldalt." };
  if (picked.length === 0) return { ok: false, error: "Válassz legalább egy lehetőséget." };
  if (!poll.multi && picked.length > 1) return { ok: false, error: "Ebben a szavazásban csak egy lehetőséget választhatsz." };
  const other = otherText.trim().slice(0, 200);
  if (picked.includes(OTHER) && !other) return { ok: false, error: "Írd be az „Egyéb” válaszodat." };
  return { ok: true, vote: { choices: picked, other_text: picked.includes(OTHER) ? other : null } };
}

export type PollResults = {
  /** People who voted. */
  voters: number;
  options: (PollOption & { count: number; pct: number })[];
  /** "Egyéb": count, percentage and the typed answers (no names), or null when not offered. */
  other: { count: number; pct: number; answers: string[] } | null;
};

/** Counts the votes. Percentages are of the voters (multi-choice polls can add up past 100%). */
export function tally(poll: Pick<PollRow, "options" | "allow_other">, votes: Vote[]): PollResults {
  const voters = votes.length;
  const pct = (n: number) => (voters ? Math.round((n / voters) * 100) : 0);
  const count = (id: string) => votes.filter((v) => v.choices.includes(id)).length;
  const answers = votes.filter((v) => v.choices.includes(OTHER) && v.other_text).map((v) => v.other_text!);
  return {
    voters,
    options: poll.options.map((o) => ({ ...o, count: count(o.id), pct: pct(count(o.id)) })),
    other: poll.allow_other ? { count: count(OTHER), pct: pct(count(OTHER)), answers } : null,
  };
}

/**
 * Options removed in the editor that already have votes: removing them would silently drop
 * those votes, so saving is refused (the admin can rename an option instead).
 */
export function removedOptionsWithVotes(before: PollOption[], after: PollOption[], votes: Vote[]): PollOption[] {
  const kept = new Set(after.map((o) => o.id));
  return before.filter((o) => !kept.has(o.id) && votes.some((v) => v.choices.includes(o.id)));
}
