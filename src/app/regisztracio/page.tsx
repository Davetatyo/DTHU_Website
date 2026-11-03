import type { Metadata } from "next";
import Link from "next/link";
import { StepWizard } from "@/features/register-page/components/StepWizard";
import { HowItWorksCard } from "@/features/register-page/components/HowItWorksCard";
import { HOW_IT_WORKS } from "@/features/register-page/lib/steps";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { getActiveTournament, getLatestRound } from "@/features/match-organizer/lib/data";
import { timeLeft } from "@/features/match-organizer/lib/time";
import "@/features/register-page/register.css";

export const metadata: Metadata = {
  title: "Regisztráció",
  description: "Csatlakozz a Dice Throne Hungary online bajnoksághoz — lépésről lépésre bemutatjuk, hogyan regisztrálj és egyeztess meccset.",
};

export default async function RegisterPage() {
  const viewer = await getCurrentProfile();
  const tournament = await getActiveTournament();
  const round = tournament ? await getLatestRound(tournament.id) : null;
  const roundOpen = round && !round.closed_at && !round.completed_at;

  return (
    <div className="space-y-8">
      <section className="hero3">
        <div className="img" style={{ backgroundImage: "url(/images/feature.webp)", backgroundPosition: "center 40%" }} />
        <div className="in">
          <span className="kicker">Dice Throne Hungary</span>
          <h1>Csatlakozz a bajnoksághoz</h1>
          <p style={{ color: "#cfcdd8", fontSize: 15, maxWidth: "52ch" }}>
            Nézd végig a lépéseket, és pár perc múlva már egyeztetheted az online
            meccsed időpontját az ellenfeleddel.
          </p>
        </div>
      </section>

      {tournament && round && (
        <section className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
              Aktív verseny
            </p>
            <p className="text-lg font-extrabold">{tournament.name}</p>
            {roundOpen && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {round.number}. forduló · határidő: {timeLeft(round.deadline)}
              </p>
            )}
          </div>
        </section>
      )}

      <section>
        <div className="sec-h">
          <h2>Hogyan csatlakozz?</h2>
        </div>
        <p className="lead" style={{ textAlign: "center" }}>
          Olvasd végig mind a négy lépést — utána megjelenik a belépés gomb.
        </p>
        {viewer ? (
          <div className="card text-center space-y-3" style={{ maxWidth: 480, margin: "0 auto" }}>
            <p className="text-lg font-extrabold">Már be vagy lépve!</p>
            <p style={{ color: "var(--muted)" }}>
              Lépj tovább az Időpontfoglalóhoz, és nézd meg a párosításodat.
            </p>
            <Link href={routes.organizer} className="btn">
              Időpontfoglaló megnyitása
            </Link>
          </div>
        ) : (
          <StepWizard loginUrl={routes.login} />
        )}
      </section>

      <section>
        <div className="sec-h">
          <h2>Hogyan működik az időpontfoglaló?</h2>
        </div>
        <p className="lead">
          Az Időpontfoglaló segít abban, hogy az ellenfeled és te megtaláljátok a közös időpontot a meccshez.
        </p>
        <div className="hiw-grid">
          {HOW_IT_WORKS.map((item) => (
            <HowItWorksCard key={item.title} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
}
