"use client";

import { useState } from "react";
import { DthuCoin } from "@/components/DthuCoin";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { QUESTION_TYPE_LABEL } from "@/features/shop/lib/economy";
import { saveQuestion } from "../actions/daily-admin";
import type { QuestionRow } from "../lib/daily-types";
import { SUPPORTED_TYPES } from "../lib/question-form";

/**
 * The admin question form with a live preview of what players will see. When the question has
 * already been answered, the answer-related fields are read-only (spec §5.2.9).
 */
export function QuestionForm({
  question,
  locked,
  rewards,
  today,
}: {
  question: QuestionRow | null;
  locked: boolean;
  rewards: { normal: number; hard: number };
  today: string;
}) {
  const [type, setType] = useState(question?.type ?? "trivia");
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [mode, setMode] = useState<"multiple_choice" | "text">(question?.answer_mode ?? "multiple_choice");
  const [options, setOptions] = useState<string[]>(() => {
    const o = question?.options ?? [];
    return [0, 1, 2, 3, 4, 5].map((i) => o[i] ?? "");
  });
  const [correct, setCorrect] = useState<number>(question?.correct_option ?? 0);
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? "normal");
  const [override, setOverride] = useState(question?.reward_override != null ? String(question.reward_override) : "");
  const reward = override.trim() !== "" ? Number(override) : difficulty === "hard" ? rewards.hard : rewards.normal;
  const ro = locked ? { readOnly: true, "aria-readonly": true } : {};

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={saveQuestion} className="card space-y-4">
        {question && <input type="hidden" name="id" value={question.id} />}
        {locked && (
          <p className="alert-error text-sm">
            Erre a kérdésre már válaszoltak: a válaszok, a nehézség és a jutalom nem változtatható. Hibát archiválással és új kérdéssel javíts.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Típus</span>
            <select name="type" className="input" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {SUPPORTED_TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Válaszforma</span>
            {locked ? (
              <>
                <input type="hidden" name="answer_mode" value={mode} />
                <input className="input" value={mode === "text" ? "Szabad szöveg" : "Feleletválasztós"} readOnly />
              </>
            ) : (
              <select name="answer_mode" className="input" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                <option value="multiple_choice">Feleletválasztós (2–6 válasz)</option>
                <option value="text">Szabad szöveg</option>
              </select>
            )}
          </label>
        </div>

        <label className="block">
          <span className="label">Kérdés</span>
          <textarea name="prompt" className="input" rows={3} maxLength={600} value={prompt} onChange={(e) => setPrompt(e.target.value)} required />
        </label>

        {mode === "multiple_choice" ? (
          <fieldset className="space-y-2">
            <legend className="label">
              Válaszok (jelöld a helyeset)
              <InfoTip text="Legalább 2, legfeljebb 6 válasz. Az üresen hagyott mezők kimaradnak. A játékosok ebben a sorrendben látják." />
            </legend>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct_option"
                  value={i}
                  checked={correct === i}
                  onChange={() => setCorrect(i)}
                  disabled={locked}
                  aria-label={`${i + 1}. válasz a helyes`}
                />
                {locked && correct === i && <input type="hidden" name="correct_option" value={i} />}
                <input
                  name={`option${i}`}
                  className="input"
                  maxLength={150}
                  value={o}
                  placeholder={i < 2 ? `${i + 1}. válasz` : `${i + 1}. válasz (nem kötelező)`}
                  onChange={(e) => setOptions((os) => os.map((x, j) => (j === i ? e.target.value : x)))}
                  {...ro}
                />
              </div>
            ))}
          </fieldset>
        ) : (
          <label className="block">
            <span className="label">
              Elfogadott válaszok (soronként egy)
              <InfoTip text="A kis- és nagybetű, a szóközök és az ékezetek nem számítanak. Írd be a gyakori változatokat is (pl. magyar és angol hősnév). Az első sor a „helyes válasz”, amit a játékosok utána látnak." />
            </span>
            <textarea name="accepted_answers" className="input" rows={3} defaultValue={(question?.accepted_answers ?? []).join("\n")} {...ro} />
          </label>
        )}

        <label className="block">
          <span className="label">Magyarázat (válasz után látszik, nem kötelező)</span>
          <textarea name="explanation" className="input" rows={2} maxLength={1000} defaultValue={question?.explanation ?? ""} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Nehézség</span>
            {locked && <input type="hidden" name="difficulty" value={difficulty} />}
            <select name={locked ? undefined : "difficulty"} className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} disabled={locked}>
              <option value="normal">Normál ({rewards.normal} coin)</option>
              <option value="hard">Nehéz ({rewards.hard} coin)</option>
            </select>
          </label>
          <label>
            <span className="label">
              Egyedi jutalom (coin)
              <InfoTip text="Csak ha ez a kérdés mást érjen, mint a nehézsége szerinti alap. Üresen hagyva az alap jár." />
            </span>
            <input name="reward_override" className="input" inputMode="numeric" value={override} onChange={(e) => setOverride(e.target.value)} placeholder="alap" {...ro} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="label">Állapot</span>
            <select name="status" className="input" defaultValue={question?.status === "draft" || !question ? "draft" : "scheduled"}>
              <option value="draft">Piszkozat (még nem használható)</option>
              <option value="scheduled">Kész (napra ütemezhető, tartaléknak is jó)</option>
            </select>
          </label>
          <label>
            <span className="label">Nap (nem kötelező)</span>
            <input name="publish_date" type="date" className="input" min={today} defaultValue={question?.publish_date && question.publish_date >= today ? question.publish_date : ""} />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allow_duplicate" /> Mentés ismétlődés esetén is (ha már van ugyanilyen szövegű kérdés)
        </label>
        <SubmitButton>{question ? "Mentés" : "Kérdés létrehozása"}</SubmitButton>
      </form>

      <div className="space-y-2">
        <h2 className="hh">
          <span>Előnézet: így látják a játékosok</span>
        </h2>
        <section className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip info">{QUESTION_TYPE_LABEL[type]}</span>
            {difficulty === "hard" && <span className="chip warn">Nehéz</span>}
            <span className="inline-flex items-center gap-1 text-sm font-bold">
              <DthuCoin size={18} /> {Number.isFinite(reward) ? reward : "?"}
            </span>
          </div>
          <p className="quiz-prompt">{prompt || <span className="muted">A kérdés szövege…</span>}</p>
          {mode === "multiple_choice" ? (
            <div className="quiz-options">
              {options.filter((o) => o.trim()).map((o, i) => (
                <label key={i} className="quiz-option">
                  <input type="radio" name="preview" disabled />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          ) : (
            <input className="input" placeholder="A válaszod" disabled />
          )}
          <button type="button" className="btn" disabled>
            Válasz beküldése
          </button>
        </section>
      </div>
    </div>
  );
}
