import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionForm } from "@/features/games/components/QuestionForm";
import { budapestDay } from "@/features/games/lib/daily";
import { answerCount } from "@/features/games/lib/daily-admin-data";
import { DailyNotReady, getQuestion } from "@/features/games/lib/daily-data";
import { STATUS_LABEL } from "@/features/games/lib/daily-types";
import { loadEconomy } from "@/features/shop/lib/economy-store";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/games/daily.css";

export const metadata: Metadata = { title: "Kérdés szerkesztése" };

export default async function QuestionEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hiba?: string }>;
}) {
  const { id } = await params;
  const { hiba } = await searchParams;
  await requireAdmin();
  const e = await loadEconomy();
  const isNew = id === "uj";

  let question = null;
  let answers = 0;
  let ready = true;
  try {
    if (!isNew) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
      question = await getQuestion(id);
      if (!question) notFound();
      answers = await answerCount(id);
    }
  } catch (err) {
    if (!(err instanceof DailyNotReady)) throw err;
    ready = false;
  }

  return (
    <div className="space-y-5">
      <div className="sec-h">
        <h1>{isNew ? "Új kérdés" : "Kérdés szerkesztése"}</h1>
        <Link href={routes.questionBank} className="btn btn-secondary btn-sm">
          Vissza a kérdésbankba
        </Link>
      </div>
      {hiba && <p className="alert-error">{hiba}</p>}
      {!ready && <p className="alert-error">Futtasd le a 0010-es migrációt, addig nem lehet kérdést menteni.</p>}
      {question && (
        <p className="muted text-sm">
          {STATUS_LABEL[question.status]} · {question.times_used}× volt napi kérdés · {answers} válasz
        </p>
      )}
      {question?.status === "archived" ? (
        <p className="alert-error">Ez a kérdés archivált, nem szerkeszthető.</p>
      ) : (
        ready && (
          <QuestionForm
            question={question}
            locked={answers > 0}
            rewards={{ normal: e.dailyRewardNormal, hard: e.dailyRewardHard }}
            today={budapestDay()}
          />
        )
      )}
    </div>
  );
}
