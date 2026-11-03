// Reads for the daily-games admin pages (service client). Server only; callers check requireAdmin.

import { createAdminClient } from "@/lib/supabase/server";
import { addDays } from "./daily";
import { DailyNotReady } from "./daily-data";
import type { QuestionRow, QuestionStatus } from "./daily-types";

const MISSING = /does not exist|schema cache|PGRST205|42P01/i;
function check<T>(res: { data: T | null; error: { code?: string; message?: string } | null }): T {
  if (res.error) {
    if (MISSING.test(`${res.error.code ?? ""} ${res.error.message ?? ""}`)) throw new DailyNotReady();
    throw new Error(res.error.message);
  }
  return res.data as T;
}

export type QuestionFilter = { type?: string; difficulty?: string; status?: QuestionStatus | ""; text?: string };

export async function listQuestions(filter: QuestionFilter): Promise<QuestionRow[]> {
  let q = createAdminClient().from("daily_questions").select("*").order("created_at", { ascending: false }).limit(300);
  if (filter.type) q = q.eq("type", filter.type);
  if (filter.difficulty) q = q.eq("difficulty", filter.difficulty);
  if (filter.status) q = q.eq("status", filter.status);
  const rows = check(await q) as QuestionRow[];
  const text = filter.text?.trim().toLowerCase();
  return text ? rows.filter((r) => r.prompt.toLowerCase().includes(text)) : rows;
}

export type CalendarDay = { day: string; fixed: QuestionRow | null; scheduled: QuestionRow | null };

/** The next `days` days: the question already given out (fixed) or scheduled for each. */
export async function upcomingCalendar(today: string, days = 14): Promise<CalendarDay[]> {
  const db = createAdminClient();
  const last = addDays(today, days - 1);
  const [scheduled, fixed] = await Promise.all([
    db.from("daily_questions").select("*").gte("publish_date", today).lte("publish_date", last),
    db.from("daily_question_days").select("day, question_id").gte("day", today).lte("day", last),
  ]);
  const sched = check(scheduled) as QuestionRow[];
  const fixedRows = check(fixed) as { day: string; question_id: string }[];
  const fixedIds = fixedRows.map((f) => f.question_id).filter((id) => !sched.some((s) => s.id === id));
  const extra = fixedIds.length
    ? (check(await db.from("daily_questions").select("*").in("id", fixedIds)) as QuestionRow[])
    : [];
  const byId = new Map([...sched, ...extra].map((q) => [q.id, q]));
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i);
    const f = fixedRows.find((r) => r.day === day);
    return { day, fixed: f ? (byId.get(f.question_id) ?? null) : null, scheduled: sched.find((s) => s.publish_date === day) ?? null };
  });
}

export async function answerCount(questionId: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("daily_question_answers")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId);
  return count ?? 0;
}

export type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  created_at: string;
};

export async function recentAudit(limit = 30): Promise<AuditRow[]> {
  return check(
    await createAdminClient().from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit),
  ) as AuditRow[];
}
