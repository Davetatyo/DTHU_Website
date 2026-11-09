import Link from "next/link";
import { Art, type ArtSpec } from "@/components/Art";
import { GAMES, type GameCard } from "../lib/hub";
import { ResetCountdown } from "./ResetCountdown";
import "../daily.css";

/** Today's state of the once-a-day games, for the signed-in player (absent for visitors). */
export type DailyDone = { quiz: boolean; spin: boolean; nextReset: string };

const DAILY_ART: Record<NonNullable<GameCard["daily"]>, ArtSpec> = {
  quiz: { c1: "#4f8fe0", c2: "#8b55d6", g: "q", plain: true },
  spin: { c1: "#d4ab52", c2: "#a8322b", g: "gem", plain: true },
};

/**
 * The Játékok page: one card per game. A daily game the player already played today is greyed
 * out and locked (not a link) with a countdown to the next 00:00 (Budapest); before that it
 * shows no timer.
 */
export function GamesHub({ daily, adminView = false }: { daily?: DailyDone; adminView?: boolean }) {
  return (
    <div className="cards tall">
      {GAMES.filter((g) => adminView || !g.adminOnly).map((g) => {
        const done = !!(g.daily && daily?.[g.daily]);
        const art: ArtSpec = g.picture
          ? { img: g.picture, pos: "center 25%" }
          : g.daily
            ? DAILY_ART[g.daily]
            : { c1: "#4f8fe0", c2: "#8b55d6", g: "q", plain: true };
        const inner = (
          <>
            <Art spec={art} />
            {done && daily && (
              <span className="daily-lock" aria-label="Ma már játszottál">
                <span className="lbl">Újra elérhető</span>
                <ResetCountdown target={daily.nextReset} />
              </span>
            )}
            <div className="in">
              <span
                className={`chip ${done ? "mut" : g.badge === "Új" ? "ok" : "mut"}`}
                style={{ alignSelf: "flex-start" }}
              >
                {done ? "Mára kész" : g.daily && daily ? "Ma még játszható" : g.badge}
              </span>
              <h3>{g.name}</h3>
              <span className="sub">{g.blurb}</span>
            </div>
          </>
        );
        if (done) {
          return (
            <div key={g.id} className="tile daily-done" aria-disabled title="Ma már játszottál, éjfélkor újra elérhető.">
              {inner}
            </div>
          );
        }
        return g.href ? (
          <Link key={g.id} href={g.href} className="tile">
            {inner}
          </Link>
        ) : (
          <div key={g.id} className="tile faded" aria-disabled>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
