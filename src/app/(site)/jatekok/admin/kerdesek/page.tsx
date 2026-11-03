import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/SubmitButton";
import { archiveQuestion, scheduleQuestion } from "@/features/games/actions/daily-admin";
import { budapestDay } from "@/features/games/lib/daily";
import { listQuestions } from "@/features/games/lib/daily-admin-data";
import { DailyNotReady } from "@/features/games/lib/daily-data";
import { STATUS_LABEL, type QuestionStatus } from "@/features/games/lib/daily-types";
import { formatDay } from "@/features/match-organizer/lib/time";
import { QUESTION_TYPE_LABEL, QUESTION_TYPES } from "@/features/shop/lib/economy";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/games/daily.css";
import "@/features/tickets/tickets.css";

export const metadata: Metadata = { title: "Kérdésbank" };

const STATUS_CHIP: Record<QuestionStatus, string> = { draft: "mut", scheduled: "ok", published: "info", archived: "mut" };

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; hiba?: string; tipus?: string; nehezseg?: string; allapot?: string; q?: string; datum?: string }>;
}) {
  const sp = await searchParams;
  await requireAdmin();
  const today = budapestDay();
  const date = sp.datum && /^\d{4}-\d{2}-\d{2}$/.test(sp.datum) && sp.datum >= today ? sp.datum : null;

  let rows = null;
  try {
    rows = await listQuestions({
      type: sp.tipus,
      difficulty: sp.nehezseg,
      status: (sp.allapot as QuestionStatus) || "",
      text: sp.q,
    });
  } catch (err) {
    if (!(err instanceof DailyNotReady)) throw err;
  }
  const here = `${routes.questionBank}?${new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && !["uzenet", "hiba"].includes(k)) as [string, string][]).toString()}`;

  return (
    <div className="space-y-5">
      <div className="sec-h">
        <h1>Kérdésbank</h1>
        <Link href={routes.questionEdit("uj")} className="btn btn-sm">
          + Új kérdés
        </Link>
        <Link href={routes.gamesAdmin} className="btn btn-secondary btn-sm">
          Vissza
        </Link>
      </div>
      {sp.uzenet && <p className="alert-ok">{sp.uzenet}</p>}
      {sp.hiba && <p className="alert-error">{sp.hiba}</p>}
      {date && (
        <p className="alert-ok">
          Kérdést választasz erre a napra: <b>{formatDay(`${date}T12:00:00Z`)}</b>. Kattints a „Erre a napra” gombra egy kész kérdésnél.{" "}
          <Link href={routes.questionBank} className="underline">
            Mégse
          </Link>
        </p>
      )}
      {!rows && <p className="alert-error">Futtasd le a 0010-es migrációt, addig a kérdésbank nem elérhető.</p>}

      <form className="card grid gap-2 sm:grid-cols-2 lg:grid-cols-5" method="get">
        {date && <input type="hidden" name="datum" value={date} />}
        <input name="q" className="input lg:col-span-2" placeholder="Keresés a szövegben…" defaultValue={sp.q ?? ""} aria-label="Keresés" />
        <select name="tipus" className="input" defaultValue={sp.tipus ?? ""} aria-label="Típus">
          <option value="">Minden típus</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select name="nehezseg" className="input" defaultValue={sp.nehezseg ?? ""} aria-label="Nehézség">
          <option value="">Minden nehézség</option>
          <option value="normal">Normál</option>
          <option value="hard">Nehéz</option>
        </select>
        <div className="flex gap-2">
          <select name="allapot" className="input" defaultValue={sp.allapot ?? ""} aria-label="Állapot">
            <option value="">Minden állapot</option>
            {(Object.keys(STATUS_LABEL) as QuestionStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary">Szűrés</button>
        </div>
      </form>

      {rows && rows.length === 0 && <p className="muted">Nincs ilyen kérdés. Írd meg az elsőt az „Új kérdés” gombbal.</p>}
      {rows && rows.length > 0 && (
        <ul className="panel3 ledger">
          {rows.map((q) => (
            <li key={q.id} className="flex-wrap">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${STATUS_CHIP[q.status]}`}>{STATUS_LABEL[q.status]}</span>
                  <span className="muted text-xs">{QUESTION_TYPE_LABEL[q.type]}</span>
                  {q.difficulty === "hard" && <span className="chip warn">Nehéz</span>}
                  {q.publish_date && q.publish_date >= today && <span className="chip info">{q.publish_date}</span>}
                  {q.times_used > 0 && <span className="muted text-xs">{q.times_used}× használva, utoljára {q.last_used_date}</span>}
                </span>
                <Link href={routes.questionEdit(q.id)} className="mt-1 block break-words">
                  {q.prompt}
                </Link>
              </span>
              <span className="flex shrink-0 gap-2">
                {date && (q.status === "scheduled" || q.status === "published") && q.publish_date !== date && (
                  <form action={scheduleQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="date" value={date} />
                    <input type="hidden" name="back" value={routes.gamesAdmin} />
                    <SubmitButton className="btn btn-sm">Erre a napra</SubmitButton>
                  </form>
                )}
                {!date && q.publish_date && q.publish_date > today && (
                  <form action={scheduleQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="date" value="" />
                    <input type="hidden" name="back" value={here} />
                    <SubmitButton className="btn btn-quiet btn-sm">Le a napról</SubmitButton>
                  </form>
                )}
                {q.status !== "archived" && (
                  <form action={archiveQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <SubmitButton className="btn btn-danger btn-sm" confirm="Archiválod a kérdést? Többé nem lesz napi kérdés.">
                      Archiválás
                    </SubmitButton>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
