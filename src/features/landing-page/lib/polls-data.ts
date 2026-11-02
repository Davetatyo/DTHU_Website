// Polls in Supabase. Server-only: service-role client (votes are anonymous and RLS has no
// policies), so callers check logins and admin rights first.

import type { PollSetup } from "@/lib/content-blocks";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { publishState } from "@/lib/publishing";
import { canSeeResults, isClosed, removedOptionsWithVotes, tally, type PollResults, type PollRow, type Vote } from "./polls";

/** What the poll card in the browser needs. */
export type PollState = {
  poll: PollRow;
  closed: boolean;
  loggedIn: boolean;
  isAdmin: boolean;
  /** The viewer's own vote (they can change it until closing). */
  myVote: Vote | null;
  /** Null while the viewer may not see results yet. */
  results: PollResults | null;
};

/** What the vote and refresh actions return to the poll card. */
export type PollActionResult = { state: PollState | null; error: string | null };

async function votesOf(pollId: string): Promise<Vote[]> {
  const { data } = await createAdminClient().from("poll_votes").select("choices, other_text").eq("poll_id", pollId);
  return (data ?? []) as Vote[];
}

export async function getPoll(id: string): Promise<PollRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("polls").select("*").eq("id", id).maybeSingle();
  return (data as PollRow | null) ?? null;
}

/** Whether the poll's article is out (players may only vote in published articles). */
export async function pollArticleIsLive(poll: PollRow): Promise<boolean> {
  const { data } = await createAdminClient().from("news").select("published_at").eq("id", poll.news_id).maybeSingle();
  return publishState((data?.published_at as string | null) ?? null) === "live";
}

export async function getPollState(poll: PollRow, viewer: Profile | null): Promise<PollState> {
  const closed = isClosed(poll);
  const isAdmin = !!viewer?.is_admin;
  let myVote: Vote | null = null;
  if (viewer) {
    const { data } = await createAdminClient()
      .from("poll_votes")
      .select("choices, other_text")
      .eq("poll_id", poll.id)
      .eq("user_id", viewer.id)
      .maybeSingle();
    myVote = (data as Vote | null) ?? null;
  }
  const results = canSeeResults({ voted: !!myVote, closed, isAdmin }) ? tally(poll, await votesOf(poll.id)) : null;
  return { poll, closed, loggedIn: !!viewer, isAdmin, myVote, results };
}

/** Poll states by id, for an article's "Szavazás" blocks. Missing polls are left out. */
export async function getPollStates(ids: string[], viewer: Profile | null): Promise<Record<string, PollState>> {
  if (!ids.length) return {};
  const { data, error } = await createAdminClient().from("polls").select("*").in("id", ids);
  const out: Record<string, PollState> = {};
  for (const poll of error ? [] : ((data ?? []) as PollRow[])) out[poll.id] = await getPollState(poll, viewer);
  return out;
}

/** Final (or current) results by id, for "Szavazás eredménye" blocks: always shown. */
export async function getPollResults(ids: string[]): Promise<Record<string, { poll: PollRow; closed: boolean; results: PollResults }>> {
  if (!ids.length) return {};
  const { data, error } = await createAdminClient().from("polls").select("*").in("id", ids);
  const out: Record<string, { poll: PollRow; closed: boolean; results: PollResults }> = {};
  for (const poll of error ? [] : ((data ?? []) as PollRow[])) out[poll.id] = { poll, closed: isClosed(poll), results: tally(poll, await votesOf(poll.id)) };
  return out;
}

/** Every poll, newest first, for the "Szavazás eredménye" picker in the editor. */
export async function getPollChoices(): Promise<{ id: string; label: string }[]> {
  const { data, error } = await createAdminClient().from("polls").select("id, question, closes_at").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((p) => ({ id: p.id as string, label: `${p.question}${isClosed(p as PollRow) ? " (lezárult)" : " (folyamatban)"}` }));
}

/**
 * Checks the article's polls before saving: a poll id must not belong to another article, and
 * options that already have votes can't be removed. Returns a Hungarian error or null.
 */
export async function checkPollSetups(newsId: string, setups: PollSetup[]): Promise<string | null> {
  if (!setups.length) return null;
  const { data, error } = await createAdminClient().from("polls").select("*").in("id", setups.map((s) => s.id));
  if (error) return "A szavazás mentése nem sikerült. Lefuttattad a 0005-ös adatbázis-frissítést?";
  for (const existing of (data ?? []) as PollRow[]) {
    if (existing.news_id !== newsId) return "Egy szavazás egy másik hírhez tartozik. Töröld, és hozz létre újat.";
    const setup = setups.find((s) => s.id === existing.id)!;
    const dropped = removedOptionsWithVotes(existing.options, setup.options, await votesOf(existing.id));
    if (dropped.length) {
      return `Erre a lehetőségre már szavaztak, ezért nem törölhető: „${dropped[0].label}”. Átnevezni lehet.`;
    }
  }
  return null;
}

/** Saves the article's polls (new and changed) and deletes the ones removed from it (with their votes). */
export async function syncPolls(newsId: string, setups: PollSetup[], adminId: string): Promise<string | null> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  if (setups.length) {
    const rows = setups.map((s) => ({
      id: s.id,
      news_id: newsId,
      question: s.question,
      options: s.options,
      multi: s.multi,
      allow_other: s.other,
      closes_at: s.closes_at,
      created_by: adminId,
      updated_at: now,
    }));
    const { error } = await db.from("polls").upsert(rows, { onConflict: "id" });
    if (error) return "A szavazás mentése nem sikerült. Lefuttattad a 0005-ös adatbázis-frissítést?";
  }
  const keep = setups.map((s) => s.id);
  let del = db.from("polls").delete().eq("news_id", newsId);
  if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
  await del;
  return null;
}
