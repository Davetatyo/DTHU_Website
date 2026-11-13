"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { getMatch } from "@/features/match-organizer/lib/data";
import { sideOf } from "@/features/match-organizer/lib/play-mode";
import type { Profile } from "@/lib/types";
import { advanceAfterResult } from "@/features/championships/lib/run";
import { matchResultColumns, reportRights, sameReport, validateReport, type ReportFields } from "@/features/championships/lib/results";
import type { MatchReport } from "@/features/championships/lib/types";

// Result reports for championship matches (rules in lib/results.ts).

function go(path: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath(routes.championships, "layout");
  redirect(`${path}?${key}=${encodeURIComponent(text)}`);
}

/** Only pages of the Bajnokságok tab, so the form can't redirect elsewhere. */
function backPath(formData: FormData): string {
  const raw = String(formData.get("back") ?? "");
  return raw.startsWith(`${routes.championships}/`) || raw === routes.championships ? raw : routes.championships;
}

async function load(formData: FormData) {
  const back = backPath(formData);
  const profile = await requireProfile();
  const match = await getMatch(String(formData.get("match_id") ?? ""));
  if (!match || !match.b) go(back, "hiba", "A meccs nem található.");

  const db = createAdminClient();
  const [{ data: t }, { data: existing }] = await Promise.all([
    db.from("tournaments").select("format, status").eq("id", match.round.tournament_id).maybeSingle(),
    db.from("match_reports").select("*").eq("match_id", match.id).maybeSingle(),
  ]);
  if (!t || t.format === "manual") go(back, "hiba", "Ez nem bajnoksági meccs.");

  const report = (existing as MatchReport | null) ?? null;
  const side = sideOf(match, profile.karnyx_name);
  const rights = reportRights(report, { side, admin: profile.is_admin });
  const open = t.status === "running" || (profile.is_admin && t.status === "finished");
  if (!open) go(back, "hiba", "Ennél a versenynél most nem lehet eredményt rögzíteni.");
  return { back, profile, match, report, side, rights };
}

/** Copies a locked result onto the match, then finishes the round / starts the next one. */
async function applyLocked(
  match: { id: string; round_id: string; player_a_id: string; player_b_id: string | null; played_at: string | null },
  outcome: ReportFields["outcome"],
): Promise<string | null> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  await db
    .from("matches")
    .update({ ...matchResultColumns(outcome, match), status: "played", played_at: match.played_at ?? now, updated_at: now })
    .eq("id", match.id);
  await db.from("proposals").update({ status: "superseded" }).eq("match_id", match.id).eq("status", "open");
  return advanceAfterResult(match.round_id);
}

function lockedMessage(next: string | null): string {
  return next ? `Az eredmény véglegesítve. ${next}` : "Az eredmény véglegesítve.";
}

export async function submitResult(formData: FormData) {
  const { back, profile, match, report, side, rights } = await load(formData);
  if (!rights.canSubmit) go(back, "hiba", "Ezt az eredményt már mindketten elfogadtátok, csak admin módosíthatja.");

  const field = (name: string) => String(formData.get(name) ?? "");
  const checked = validateReport(
    {
      outcome: field("outcome"),
      hp_a: field("hp_a"),
      hp_b: field("hp_b"),
      pick_a: field("pick_a"),
      pick_b: field("pick_b"),
      ban_a: field("ban_a"),
      ban_b: field("ban_b"),
    },
    match.a.heroes,
    match.b!.heroes,
  );
  if (!checked.ok) go(back, "hiba", checked.error);
  const fields = checked.report;
  const db = createAdminClient();
  const now = new Date().toISOString();

  if (rights.locksOnSubmit) {
    const row = { ...fields, submitted_side: "admin", submitted_by: profile.id, submitted_at: now, confirmed_by: profile.id, confirmed_at: now };
    const { error } = await db.from("match_reports").upsert({ match_id: match.id, ...row }, { onConflict: "match_id" });
    if (error) go(back, "hiba", `Nem sikerült menteni: ${error.message}`);
    go(back, "uzenet", lockedMessage(await applyLocked(match, fields.outcome)));
  }

  // The opponent's pending report with exactly the same result: that's a confirmation.
  if (rights.canConfirm && report && sameReport(report, fields)) {
    await confirm(match, report, profile, back);
  }

  const row = { ...fields, submitted_side: side!, submitted_by: profile.id, submitted_at: now, confirmed_by: null, confirmed_at: null };
  const { error } = report
    ? await db.from("match_reports").update(row).eq("match_id", match.id).is("confirmed_at", null)
    : await db.from("match_reports").insert({ match_id: match.id, ...row });
  if (error) go(back, "hiba", "Közben változott az eredmény, frissítsd az oldalt és nézd meg újra.");
  const opponent = side === "a" ? match.b!.karnyx_name : match.a.karnyx_name;
  go(back, "uzenet", `Eredmény elküldve. ${opponent} jóváhagyására vár.`);
}

async function confirm(
  match: NonNullable<Awaited<ReturnType<typeof getMatch>>>,
  report: MatchReport,
  profile: Profile,
  back: string,
): Promise<never> {
  const now = new Date().toISOString();
  // Only the exact report the viewer saw: if it was corrected in between, nothing is confirmed.
  const { data } = await createAdminClient()
    .from("match_reports")
    .update({ confirmed_by: profile.id, confirmed_at: now })
    .eq("match_id", match.id)
    .eq("submitted_at", report.submitted_at)
    .is("confirmed_at", null)
    .select("match_id");
  if (!data?.length) go(back, "hiba", "Közben változott az eredmény, frissítsd az oldalt és nézd meg újra.");
  go(back, "uzenet", lockedMessage(await applyLocked(match, report.outcome)));
}

export async function confirmResult(formData: FormData) {
  const { back, profile, match, report, rights } = await load(formData);
  if (!rights.canConfirm || !report) go(back, "hiba", "Nincs jóváhagyásra váró eredmény.");
  if (String(formData.get("submitted_at") ?? "") !== report.submitted_at) {
    go(back, "hiba", "Közben változott az eredmény, frissítsd az oldalt és nézd meg újra.");
  }
  await confirm(match, report, profile, back);
}
