"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site";
import { slugify, uniqueSlug } from "@/lib/publishing";
import { createAdminClient } from "@/lib/supabase/server";
import { checkVote } from "@/features/landing-page/lib/polls";
import { getPoll, getPollState, pollArticleIsLive, type PollActionResult } from "@/features/landing-page/lib/polls-data";

/** The poll card asks for fresh numbers every few seconds ("live" results). */
export async function refreshPoll(pollId: string): Promise<PollActionResult> {
  const poll = await getPoll(pollId);
  if (!poll) return { state: null, error: "A szavazás nem található." };
  return { state: await getPollState(poll, await getCurrentProfile()), error: null };
}

/**
 * Casts or changes the viewer's vote. Logged-in users only; one row per account; only while
 * the poll is open; in unpublished articles only admins (who can preview them) may vote.
 */
export async function votePoll(pollId: string, choices: string[], otherText: string): Promise<PollActionResult> {
  const viewer = await getCurrentProfile();
  if (!viewer) return { state: null, error: "A szavazáshoz lépj be Discorddal." };
  const poll = await getPoll(pollId);
  if (!poll) return { state: null, error: "A szavazás nem található." };
  if (!viewer.is_admin && !(await pollArticleIsLive(poll))) return { state: null, error: "Ez a szavazás még nem nyílt meg." };

  const checked = checkVote(poll, Array.isArray(choices) ? choices.map(String) : [], String(otherText ?? ""));
  if (!checked.ok) return { state: await getPollState(poll, viewer), error: checked.error };

  const { error } = await createAdminClient()
    .from("poll_votes")
    .upsert(
      { poll_id: poll.id, user_id: viewer.id, choices: checked.vote.choices, other_text: checked.vote.other_text, updated_at: new Date().toISOString() },
      { onConflict: "poll_id,user_id" },
    );
  if (error) return { state: await getPollState(poll, viewer), error: "A szavazat mentése nem sikerült, próbáld újra." };
  return { state: await getPollState(poll, viewer), error: null };
}

/**
 * "Új hír az eredményből": a new draft article about a poll's results, with a "Szavazás
 * eredménye" block and a link back to the original article, in the same category.
 */
export async function createNewsFromPoll(formData: FormData) {
  const me = await requireAdmin();
  const poll = await getPoll(String(formData.get("poll_id") ?? ""));
  if (!poll) redirect(`${routes.adminNews}?hiba=${encodeURIComponent("A szavazás nem található.")}`);

  const db = createAdminClient();
  const { data: original } = await db.from("news").select("slug, title, category").eq("id", poll.news_id).maybeSingle();
  const title = `Eredmény: ${poll.question}`.slice(0, 140);
  const base = slugify(title, "hir");
  const { data: similar } = await db.from("news").select("slug").like("slug", `${base}%`);
  const slug = uniqueSlug(base, new Set((similar ?? []).map((r) => r.slug as string)));
  const body = [
    { t: "p", text: "Lezárult a szavazás, köszönjük mindenkinek, aki szavazott! Az eredmény:" },
    { t: "pollresult", id: poll.id },
    ...(original ? [{ t: "link", url: `${await getSiteUrl()}${routes.newsArticle(original.slug as string)}`, label: `Az eredeti hír: ${original.title}` }] : []),
  ];

  const { data, error } = await db
    .from("news")
    .insert({
      slug,
      title,
      category: (original?.category as string | undefined) ?? "community",
      body,
      author_id: me.id,
      created_by: me.id,
      updated_by: me.id,
    })
    .select("id")
    .single();
  if (error || !data) redirect(`${routes.adminNews}?hiba=${encodeURIComponent("A hír létrehozása nem sikerült, próbáld újra.")}`);
  revalidatePath("/", "layout");
  redirect(`${routes.adminNewsItem(data.id)}?uzenet=${encodeURIComponent("Piszkozat az eredményről elkészült. Írd meg a szöveget, majd tedd közzé.")}`);
}
