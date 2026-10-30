import type { Metadata } from "next";
import { Art, heroArt } from "@/components/Art";
import { HeroAvatar } from "@/components/HeroAvatar";
import { getCurrentProfile } from "@/lib/auth";
import { loadRanking } from "@/features/rankings/lib/load";
import { movement } from "@/features/rankings/lib/ranking";
import "@/features/rankings/rankings.css";

export const metadata: Metadata = { title: "Ranglista" };

export default async function RankingsPage() {
  const me = (await getCurrentProfile())?.karnyx_name;
  const rows = await loadRanking();
  const leader = rows[0];

  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>DTHU Power Ranking</h1>
        </div>
        <p className="lead">2026 ősz · példaadatok · a változás az előző héthez képest</p>
      </div>
      <div className="l3">
        <div className="panel3 overflow-hidden">
          <div className="pr-big pr-head">
            <span>#</span>
            <span />
            <span />
            <span>Játékos</span>
            <span className="rec">Mérleg</span>
            <span className="p">Pont</span>
          </div>
          {rows.map((r, i) => {
            const [cls, label] = movement(r.p);
            return (
              <div key={r.p} className={`pr-big${i < 3 ? " top" : ""}${r.p === me ? " me" : ""}`}>
                <span className="n">{i + 1}</span>
                <span className={`mv ${cls}`}>{label}</span>
                <HeroAvatar name={r.p} hero={r.hero} />
                <span className="min-w-0">
                  <b>{r.p}</b>
                  <br />
                  <small className="muted">{r.hero}</small>
                </span>
                <span className="rec">
                  {r.w}–{r.l}
                </span>
                <span className="p">{r.pts}</span>
              </div>
            );
          })}
          {rows.length === 0 && <p className="muted p-4">Még nincs aktív verseny.</p>}
        </div>
        {leader && (
          <aside>
            <div className="tile" style={{ minHeight: 320 }}>
              <Art spec={heroArt(leader.hero)} />
              <span className="badge-tl livechip">#1</span>
              <div className="in">
                <span className="k">Éllovas</span>
                <h3>{leader.p}</h3>
                <span className="sub">
                  {leader.hero} · {leader.w}–{leader.l} · {leader.pts} pont
                </span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
