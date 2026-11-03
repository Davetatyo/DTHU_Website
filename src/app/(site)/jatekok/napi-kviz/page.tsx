import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DthuCoin } from "@/components/DthuCoin";
import { SubmitButton } from "@/components/SubmitButton";
import { answerToday } from "@/features/games/actions/daily";
import { ResetCountdown } from "@/features/games/components/ResetCountdown";
import { StreakInfo } from "@/features/games/components/StreakInfo";
import { DailyNotReady, getDailyState } from "@/features/games/lib/daily-data";
import { QUESTION_TYPE_LABEL } from "@/features/shop/lib/economy";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/games/daily.css";

export const metadata: Metadata = { title: "Napi kvíz" };

export default async function DailyQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ uzenet?: string; hiba?: string; eredmeny?: string }>;
}) {
  const { uzenet, hiba, eredmeny } = await searchParams;
  const viewer = await getCurrentProfile();
  let state = null;
  let ready = true;
  try {
    state = await getDailyState(viewer?.id ?? null);
  } catch (err) {
    if (!(err instanceof DailyNotReady)) throw err;
    ready = false;
  }
  // Locked after answering: only the result view right after the answer (eredmeny=1) is shown;
  // any other visit goes back to the Játékok page, where the card is grey with the countdown.
  if (viewer && state?.answer && !eredmeny) redirect(routes.games);
  const q = state?.question ?? null;

  return (
    <div className="daily-panel space-y-5">
      <div>
        <div className="sec-h">
          <h1>Napi kvíz</h1>
        </div>
        <p className="lead">
          Minden nap egy kérdés, mindenkinek ugyanaz. Egyszer válaszolhatsz, a jó válasz DTHU coint ér. Az új kérdés
          éjfélkor (budapesti idő) jön.
        </p>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}
      {!ready && (
        <p className="alert-error">
          A napi játékok adatbázisa még nincs beállítva (supabase/migrations/0010_daily_spin_and_question.sql).
        </p>
      )}

      {ready && !q && <p className="muted">Mára nincs kérdés. Nézz vissza holnap!</p>}

      {q && state && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip info">{QUESTION_TYPE_LABEL[q.type]}</span>
            {q.difficulty === "hard" && <span className="chip warn">Nehéz</span>}
            <span className="inline-flex items-center gap-1 text-sm font-bold">
              <DthuCoin size={18} /> {q.reward}
            </span>
          </div>
          <p className="quiz-prompt">{q.prompt}</p>

          {state.reveal ? (
            <div className={`reveal space-y-1 ${state.reveal.isCorrect ? "ok" : "bad"}`}>
              <p className="font-bold">
                {state.reveal.isCorrect ? `Helyes! +${state.reveal.coins} DTHU coin` : "Most nem talált."}
              </p>
              <p>
                A válaszod: <b>{state.reveal.answer}</b>
              </p>
              {!state.reveal.isCorrect && (
                <p>
                  A helyes válasz: <b>{state.reveal.correctText}</b>
                </p>
              )}
              {state.reveal.explanation && <p className="muted whitespace-pre-line">{state.reveal.explanation}</p>}
            </div>
          ) : viewer ? (
            <form action={answerToday} className="space-y-3">
              <input type="hidden" name="question_id" value={q.id} />
              {q.answer_mode === "multiple_choice" ? (
                <div className="quiz-options" role="radiogroup" aria-label="Válaszok">
                  {(q.options ?? []).map((o, i) => (
                    <label key={i} className="quiz-option">
                      <input type="radio" name="answer" value={i} required />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="label" htmlFor="answer">
                    A válaszod
                  </label>
                  <input id="answer" name="answer" className="input" maxLength={200} autoComplete="off" required />
                  <p className="muted mt-1 text-xs">A kis- és nagybetű, a szóközök és az ékezetek nem számítanak.</p>
                </div>
              )}
              <SubmitButton confirm="Csak egyszer válaszolhatsz. Beküldöd?">Válasz beküldése</SubmitButton>
            </form>
          ) : (
            <Link href={routes.login} className="btn btn-discord self-start">
              Belépés a válaszadáshoz
            </Link>
          )}
        </section>
      )}

      {state?.answer && (
        <div className="daily-done-box">
          <span className="muted text-sm">Következő kérdés:</span>
          <ResetCountdown target={state.nextReset} />
          <Link href={routes.games} className="btn btn-secondary btn-sm ml-auto">
            Vissza a játékokhoz
          </Link>
        </div>
      )}
      {viewer && state && <StreakInfo game="quiz" streak={state.quizStreak} length={state.streakLength} bonus={state.streakBonus} />}
    </div>
  );
}
