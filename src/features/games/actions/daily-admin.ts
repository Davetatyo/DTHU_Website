"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QUESTION_TYPES, spinEv, spinTableProblems, type Economy, type QuestionType, type SpinPrize } from "@/features/shop/lib/economy";
import { loadEconomy, saveEconomy } from "@/features/shop/lib/economy-store";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/server";
import { budapestDay } from "../lib/daily";
import { dailyErrorMessage } from "../lib/daily-errors";
import type { QuestionRow } from "../lib/daily-types";
import { changedLockedFields, findDuplicate, parseQuestionForm } from "../lib/question-form";

// Admin tools for the daily games: settings, questions, scheduling. Every change is written to
// the audit log (settings by the database function economy_config_set, questions here).

function done(to: string, key: "uzenet" | "hiba", text: string): never {
  revalidatePath(routes.games, "layout");
  revalidatePath(routes.shop, "layout");
  const sep = to.includes("?") ? "&" : "?";
  redirect(`${to}${sep}${key}=${encodeURIComponent(text)}`);
}

const field = (fd: FormData, name: string) => String(fd.get(name) ?? "").trim();
const whole = (text: string) => (/^\d{1,8}$/.test(text) ? Number(text) : null);

async function audit(actor: string, action: string, id: string, before: unknown, after: unknown, reason?: string) {
  const { error } = await createAdminClient()
    .from("audit_log")
    .insert({ actor_id: actor, action, entity_type: "daily_question", entity_id: id, before, after, reason: reason || null });
  if (error) console.error("audit_log hiba", error.message);
}

// ── Settings ────────────────────────────────────────────────────────────────────────────────

export async function saveSettings(formData: FormData) {
  const admin = await requireAdmin();
  const back: (k: "uzenet" | "hiba", t: string) => never = (k, t) => done(routes.gamesAdmin, k, t);
  const current = await loadEconomy();

  let table: SpinPrize[];
  try {
    table = (JSON.parse(field(formData, "spin_table")) as SpinPrize[]).map((p) => ({
      label: String(p.label ?? "").trim(),
      chance: Number(p.chance),
      coins: Number(p.coins),
    }));
  } catch {
    back("hiba", "A nyereménytábla nem olvasható.");
  }
  const problems = spinTableProblems(table);
  if (problems.length) back("hiba", problems.join(" "));

  const nums = {
    ticketPrice: whole(field(formData, "ticket_price")),
    dailyRewardNormal: whole(field(formData, "reward_normal")),
    dailyRewardHard: whole(field(formData, "reward_hard")),
    streakLengthDays: whole(field(formData, "streak_length")),
    streakBonusCoins: whole(field(formData, "streak_bonus")),
  };
  if (Object.values(nums).some((n) => n === null)) back("hiba", "Minden szám mező 0 vagy pozitív egész szám legyen.");
  if (nums.ticketPrice! < 1) back("hiba", "A jegy ára legalább 1 coin.");
  if (nums.streakLengthDays! < 1 || nums.streakLengthDays! > 365) back("hiba", "A sorozat hossza 1 és 365 nap között legyen.");
  const maxEv = Number(field(formData, "max_spin_ev").replace(",", "."));
  if (!(maxEv >= 0)) back("hiba", "A kerék várható értékének határa 0 vagy pozitív szám legyen.");
  const schedule = [0, 1, 2, 3, 4, 5, 6].map((i) => field(formData, `schedule${i}`) as QuestionType);
  if (!schedule.every((t) => QUESTION_TYPES.includes(t))) back("hiba", "Minden napra válassz kérdéstípust.");

  const next: Economy = {
    ...current,
    ticketPrice: nums.ticketPrice!,
    dailyRewardNormal: nums.dailyRewardNormal!,
    dailyRewardHard: nums.dailyRewardHard!,
    streakLengthDays: nums.streakLengthDays!,
    streakBonusCoins: nums.streakBonusCoins!,
    maxSpinEv: maxEv,
    dailyFallbackEnabled: formData.get("fallback") === "on",
    spinTable: table,
    dailyTypeSchedule: schedule,
  };
  let changed: string[];
  try {
    changed = await saveEconomy(next, admin.id, field(formData, "reason").slice(0, 300));
  } catch (err) {
    back("hiba", `Mentés sikertelen: ${err instanceof Error ? err.message : "ismeretlen hiba"}. Lefutott a 0010-es migráció?`);
  }
  if (changed.length === 0) back("uzenet", "Nem változott semmi.");
  const ev = spinEv(table);
  const warn = ev > maxEv ? ` Figyelem: a kerék várható értéke ${ev.toFixed(2)} coin, a megadott határ ${maxEv}.` : "";
  back("uzenet", `Mentve (${changed.length} beállítás). Az új értékek a következő eseményektől számítanak.${warn}`);
}

// ── Questions ───────────────────────────────────────────────────────────────────────────────

export async function saveQuestion(formData: FormData) {
  const admin = await requireAdmin();
  const id = field(formData, "id");
  const editTo = id ? routes.questionEdit(id) : routes.questionEdit("uj");
  const fields = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = parseQuestionForm(fields, budapestDay());
  if (!parsed.ok) done(editTo, "hiba", parsed.error);
  const value = parsed.value;
  const db = createAdminClient();

  let saved: QuestionRow | null = null;
  if (id) {
    const { data } = await db.from("daily_questions").select("*").eq("id", id).maybeSingle();
    saved = data as QuestionRow | null;
    if (!saved) done(routes.questionBank, "hiba", "Nem találom ezt a kérdést.");
    if (saved.status === "archived") done(editTo, "hiba", "Archivált kérdést nem lehet szerkeszteni.");
    const { count } = await db.from("daily_question_answers").select("id", { count: "exact", head: true }).eq("question_id", id);
    const locked = count ? changedLockedFields(saved, value) : [];
    if (locked.length) {
      done(editTo, "hiba", "Erre a kérdésre már válaszoltak, ezért a válaszok, a nehézség és a jutalom nem változhat. Archiváld, és írj újat.");
    }
  }

  if (formData.get("allow_duplicate") !== "on") {
    const { data: others } = await db.from("daily_questions").select("id, prompt").neq("status", "archived");
    const dup = findDuplicate(value.prompt, (others ?? []) as { id: string; prompt: string }[], id || undefined);
    if (dup) done(editTo, "hiba", "Már van ugyanilyen szövegű kérdés. Ha mégis mentenéd, pipáld be a „Mentés ismétlődés esetén is” mezőt.");
  }

  // A question that has already been a daily question keeps its "published" status.
  const status = saved?.status === "published" ? "published" : value.status;
  const row = { ...value, status, updated_by: admin.id, updated_at: new Date().toISOString() };
  if (saved) {
    const { error } = await db.from("daily_questions").update(row).eq("id", saved.id);
    if (error) done(editTo, "hiba", dailyErrorMessage(error));
    await audit(admin.id, "question_update", saved.id, saved, row);
    done(routes.questionBank, "uzenet", "Kérdés mentve.");
  }
  const { data: created, error } = await db.from("daily_questions").insert({ ...row, created_by: admin.id }).select("id").single();
  if (error || !created) done(editTo, "hiba", dailyErrorMessage(error));
  await audit(admin.id, "question_create", created.id, null, row);
  done(routes.questionBank, "uzenet", "Új kérdés mentve.");
}

export async function archiveQuestion(formData: FormData) {
  const admin = await requireAdmin();
  const id = field(formData, "id");
  const db = createAdminClient();
  const { data } = await db.from("daily_questions").select("*").eq("id", id).maybeSingle();
  const q = data as QuestionRow | null;
  if (!q) done(routes.questionBank, "hiba", "Nem találom ezt a kérdést.");
  // A future date is freed so another question can take it; past days keep their history.
  const freeDate = q.publish_date && q.publish_date > budapestDay() ? null : q.publish_date;
  const { error } = await db.from("daily_questions").update({ status: "archived", publish_date: freeDate, updated_by: admin.id }).eq("id", id);
  if (error) done(routes.questionBank, "hiba", dailyErrorMessage(error));
  await audit(admin.id, "question_archive", id, { status: q.status, publish_date: q.publish_date }, { status: "archived", publish_date: freeDate });
  done(routes.questionBank, "uzenet", "Kérdés archiválva.");
}

/** Puts a ready question on a day (reuse included), or takes it off its day (empty date). */
export async function scheduleQuestion(formData: FormData) {
  const admin = await requireAdmin();
  const id = field(formData, "id");
  const date = field(formData, "date") || null;
  const back = field(formData, "back") || routes.questionBank;
  const today = budapestDay();
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today)) done(back, "hiba", "Csak mai vagy jövőbeli napra lehet ütemezni.");
  const db = createAdminClient();
  const { data } = await db.from("daily_questions").select("*").eq("id", id).maybeSingle();
  const q = data as QuestionRow | null;
  if (!q) done(back, "hiba", "Nem találom ezt a kérdést.");
  if (q.status === "draft" || q.status === "archived") done(back, "hiba", "Csak „Kész” vagy már használt kérdést lehet ütemezni.");
  if (date === today) {
    const { data: fixed } = await db.from("daily_question_days").select("question_id").eq("day", today).maybeSingle();
    if (fixed && fixed.question_id !== id) done(back, "hiba", "A mai kérdés már ki van osztva a játékosoknak, ma már nem cserélhető.");
  }
  const { error } = await db.from("daily_questions").update({ publish_date: date, updated_by: admin.id }).eq("id", id);
  if (error) done(back, "hiba", dailyErrorMessage(error));
  await audit(admin.id, date ? "question_schedule" : "question_unschedule", id, { publish_date: q.publish_date }, { publish_date: date });
  done(back, "uzenet", date ? `Ütemezve: ${date}.` : "Levéve a napról.");
}
