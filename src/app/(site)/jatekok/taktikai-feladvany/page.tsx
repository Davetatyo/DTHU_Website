/* eslint-disable @next/next/no-img-element -- hero portraits from /public, sized by CSS */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canOpenPuzzles } from "@/features/puzzle/lib/access";
import { HEROES } from "@/features/puzzle/lib/heroes";
import { GOAL_HU, PUZZLES } from "@/features/puzzle/lib/puzzles";
import "@/features/puzzle/puzzle.css";
import { getAdminView } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Taktikai feladvány" };

export default async function PuzzlesPage() {
  if (!canOpenPuzzles(await getAdminView())) redirect(routes.games);
  return (
    <div className="space-y-3">
      <div className="sec-h">
        <h1>Taktikai feladvány</h1>
      </div>
      <p className="lead">
        Kész asztal, kész kockák. Játssz ki lapokat a kezedből, válassz képességet, és találd meg a legbiztosabb utat a győzelemhez.
        Kísérleti játék: egyelőre csak adminok látják.
      </p>
      <div className="tf-list">
        {PUZZLES.map((p) => (
          <Link key={p.id} href={routes.puzzle(p.id)} className="card tf-list-item">
            <span className="tf-list-heroes">
              <img src={HEROES[p.state.attacker.hero].portrait} alt="" />
              <span>vs</span>
              <img src={HEROES[p.state.defender.hero].portrait} alt="" />
            </span>
            <span className="tf-list-text">
              <b>
                {p.id}. {p.title}
              </b>
              <span className="muted text-sm">
                {GOAL_HU[p.goal]} · {HEROES[p.state.attacker.hero].name} a {HEROES[p.state.defender.hero].name} ellen
              </span>
            </span>
          </Link>
        ))}
      </div>
      <p className="muted text-sm">
        <Link href={routes.games} className="link">
          ‹ Játékok
        </Link>
      </p>
    </div>
  );
}
