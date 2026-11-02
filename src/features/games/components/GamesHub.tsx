import Link from "next/link";
import { Art } from "@/components/Art";
import { GAMES } from "../lib/hub";

/** The Játékok page: one card per game. */
export function GamesHub() {
  return (
    <div className="cards tall">
      {GAMES.map((g) => {
        const inner = (
          <>
            <Art spec={g.picture ? { img: g.picture, pos: "center 25%" } : { c1: "#4f8fe0", c2: "#8b55d6", g: "q", plain: true }} />
            <div className="in">
              <span className={`chip ${g.badge === "Új" ? "ok" : "mut"}`} style={{ alignSelf: "flex-start" }}>
                {g.badge}
              </span>
              <h3>{g.name}</h3>
              <span className="sub">{g.blurb}</span>
            </div>
          </>
        );
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
