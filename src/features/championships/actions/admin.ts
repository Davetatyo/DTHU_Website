"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { wallTimeToUtc } from "@/features/match-organizer/lib/time";
import { createEngineRound, getTournamentBySlug, startTournament } from "@/features/championships/lib/run";
import { RESERVED_SLUGS } from "@/features/championships/lib/access";
import { FORMAT_LABELS, PLAYABLE_FORMATS } from "@/features/championships/lib/rules";
import { slugify, uniqueSlug } from "@/lib/publishing";
import type { Championship, ChampionshipFormat, ChampionshipSettings } from "@/features/championships/lib/types";

function go(path: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath("/", "layout");
  redirect(`${path}?${key}=${encodeURIComponent(text)}`);
}

async function tournamentFrom(formData: FormData): Promise<Championship> {
  const t = await getTournamentBySlug(String(formData.get("slug") ?? ""));
  if (!t) go(routes.championshipsAdmin, "hiba", "A verseny nem található.");
  return t;
}

function parseOptionalTime(value: FormDataEntryValue | null, timeZone: string): Date | null | "invalid" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    return wallTimeToUtc(raw, timeZone);
  } catch {
    return "invalid";
  }
}

export async function createChampionship(formData: FormData) {
  const admin = await requireAdmin();
  const back = routes.championshipsAdmin;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) go(back, "hiba", "Adj nevet a versenynek.");

  const format = String(formData.get("format") ?? "") as ChampionshipFormat;
  if (!PLAYABLE_FORMATS.includes(format)) go(back, "hiba", "Ez a formátum még nem választható.");
  const bestOf = Number(formData.get("best_of") ?? 1);
  // Results are reported per game (one pick, ban and health each), so only Bo1 for now.
  if (bestOf !== 1) go(back, "hiba", "Egyelőre csak 1 játszmás meccs választható.");

  const settings: ChampionshipSettings = {};
  const rounds = Number(formData.get("settings_rounds") || 0);
  if (rounds > 0) settings.rounds = Math.min(rounds, 20);
  const roundDays = Number(formData.get("round_days") || 0);
  if (roundDays > 0) settings.round_days = Math.min(roundDays, 60);

  const startsAt = parseOptionalTime(formData.get("starts_at"), admin.timezone);
  if (startsAt === "invalid") go(back, "hiba", "Érvénytelen kezdési időpont.");

  const db = createAdminClient();
  const { data: slugRows } = await db.from("tournaments").select("slug").not("slug", "is", null);
  // Page addresses under /bajnoksagok (admin, osszes, …) can't be championship slugs.
  const taken = new Set<string>([...RESERVED_SLUGS, ...(slugRows ?? []).map((r) => r.slug as string)]);
  const slug = uniqueSlug(slugify(name, "bajnoksag"), taken);
  const { error } = await db
    .from("tournaments")
    .insert({
      name,
      slug,
      format,
      best_of: bestOf,
      settings,
      is_active: false,
      status: formData.get("open_now") === "on" ? "registration" : "draft",
      starts_at: startsAt?.toISOString() ?? null,
      auto_pairing: formData.get("auto_pairing") === "on",
    });
  if (error) go(back, "hiba", `Nem sikerült létrehozni: ${error.message}`);
  go(routes.championshipAdmin(slug), "uzenet", `„${name}” létrehozva (${FORMAT_LABELS[format]}).`);
}

export async function openRegistration(formData: FormData) {
  await requireAdmin();
  const t = await tournamentFrom(formData);
  await createAdminClient().from("tournaments").update({ status: "registration" }).eq("id", t.id).eq("status", "draft");
  go(routes.championshipAdmin(t.slug), "uzenet", "A jelentkezés megnyílt, a játékosok a Bajnokságok oldalon csatlakozhatnak.");
}

export async function updateStartTime(formData: FormData) {
  const admin = await requireAdmin();
  const t = await tournamentFrom(formData);
  const back = routes.championshipAdmin(t.slug);
  if (t.status === "running" || t.status === "finished") go(back, "hiba", "Elindult versenynél már nem módosítható.");
  const startsAt = parseOptionalTime(formData.get("starts_at"), admin.timezone);
  if (startsAt === "invalid") go(back, "hiba", "Érvénytelen kezdési időpont.");
  await createAdminClient().from("tournaments").update({ starts_at: startsAt?.toISOString() ?? null }).eq("id", t.id);
  go(back, "uzenet", startsAt ? "Kezdési időpont mentve." : "Kezdési időpont törölve: kézzel indítod.");
}

export async function startTournamentNow(formData: FormData) {
  await requireAdmin();
  const t = await tournamentFrom(formData);
  const back = routes.championshipAdmin(t.slug);
  const result = await startTournament(t);
  if (!result.ok) go(back, "hiba", result.error);
  const parts = [`A verseny elindult ${result.players} játékossal.`];
  if (result.round?.ok) parts.push(`Az 1. forduló párosítása kész (${result.round.matchCount} meccs).`);
  else if (result.round) parts.push(`Párosítás nem sikerült: ${result.round.error}`);
  else parts.push("Az 1. fordulót lent generálhatod.");
  go(back, "uzenet", parts.join(" "));
}

export async function generateEngineRound(formData: FormData) {
  const admin = await requireAdmin();
  const t = await tournamentFrom(formData);
  const back = routes.championshipAdmin(t.slug);
  if (t.status !== "running") go(back, "hiba", "Csak folyamatban lévő versenyhez lehet fordulót generálni.");
  const deadline = parseOptionalTime(formData.get("deadline"), admin.timezone);
  if (!deadline || deadline === "invalid") go(back, "hiba", "Érvénytelen határidő.");

  const result = await createEngineRound(t, deadline);
  if (!result.ok) go(back, "hiba", result.error);
  const msg = `A ${result.round.number}. forduló elindult ${result.matchCount} meccsel${result.byes ? `, ${result.byes} Bye` : ""}.`;
  go(back, "uzenet", result.warnings.length ? `${msg} Figyelem: ${result.warnings.join(" ")}` : msg);
}

export async function removeRegistration(formData: FormData) {
  await requireAdmin();
  const t = await tournamentFrom(formData);
  const back = routes.championshipAdmin(t.slug);
  if (t.status === "running" || t.status === "finished") go(back, "hiba", "Elindult versenyből már nem lehet jelentkezőt törölni.");
  await createAdminClient()
    .from("tournament_registrations")
    .delete()
    .eq("tournament_id", t.id)
    .eq("profile_id", String(formData.get("profile_id")));
  go(back, "uzenet", "Jelentkező eltávolítva.");
}

export async function deleteChampionship(formData: FormData) {
  await requireAdmin();
  const t = await tournamentFrom(formData);
  const typed = String(formData.get("confirm_name") ?? "").trim().toLowerCase();
  if (typed !== t.name.trim().toLowerCase()) {
    go(routes.championshipAdmin(t.slug), "hiba", `A törléshez pontosan írd be a verseny nevét: „${t.name}”.`);
  }
  const { error } = await createAdminClient().from("tournaments").delete().eq("id", t.id);
  if (error) go(routes.championshipAdmin(t.slug), "hiba", "A törlés nem sikerült, próbáld újra.");
  go(routes.championshipsAdmin, "uzenet", `A(z) „${t.name}” verseny törölve.`);
}
