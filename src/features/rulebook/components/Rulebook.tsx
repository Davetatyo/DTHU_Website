"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Art, heroArt } from "@/components/Art";
import { Icon, type IconId } from "@/components/Icon";
import { RT_FAQ, RT_FAQCAT } from "../data/faq";
import { RT_HEROES } from "../data/heroes";
import { RT_TABS, RULES } from "../data/rules";
import { RT_TOKENS } from "../data/tokens";
import { norm, ruleIndex, searchRules } from "../lib/search";
import "../rulebook.css";

const INTRO: Record<string, string> = {
  gyors: "A legfontosabb tudnivalók egy helyen: előkészítés, a kör menete, győzelem.",
  reszletes: "Minden szabály külön oldalon. Kattints egy címre, és a link közvetlenül arra a szabályra mutat.",
  modok: "Életerő, sorrend és célzás játékmódonként.",
};
const CAT_COLOR: Record<string, string> = { gyors: "#d4ab52", reszletes: "#4f8fe0", modok: "#a8322b" };
const ICONS: IconId[] = ["book", "die", "swords", "scroll", "gem"];

function Highlight({ text, q }: { text: string; q: string }) {
  const n = norm(q);
  const i = norm(text).indexOf(n);
  if (!n || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + n.length)}</mark>
      {text.slice(i + n.length)}
    </>
  );
}

function RuleTiles({ cat }: { cat: string }) {
  return (
    <div className="cards sm">
      {RULES.filter((r) => r.cat === cat).map((r, i) => (
        <Link key={r.id} className="tile" href={`/szabalytar/${r.id}`}>
          <Art
            spec={{
              c1: CAT_COLOR[cat],
              c2: ["#8b55d6", "#5eae4a", "#d4ab52", "#3fb39a"][i % 4],
              g: ICONS[i % 5],
              x: `${20 + ((i * 13) % 60)}%`,
              prompt: `illustrated icon scene for the rule "${r.en}", fantasy board game manual art`,
            }}
          />
          <div className="in">
            <h3 className="text-lg">{r.t}</h3>
            <span className="sub">{r.en}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Szabálytár: search, tabs (quick reference, rules, modes, heroes, tokens, rules FAQ, index). */
export function Rulebook({ initialTab }: { initialTab: string }) {
  const router = useRouter();
  const path = usePathname();
  const [tab, setTab] = useState(RT_TABS.some(([k]) => k === initialTab) ? initialTab : "gyors");
  const [q, setQ] = useState("");
  const [faqCat, setFaqCat] = useState("");
  const [filter, setFilter] = useState("");

  function chooseTab(t: string) {
    setTab(t);
    setQ("");
    setFilter("");
    router.replace(`${path}?tab=${t}`, { scroll: false });
  }

  const searching = q.trim().length > 1;
  const hits = searching ? searchRules(q) : [];
  const f = norm(filter);

  return (
    <div className="space-y-3">
      <div className="rt-search">
        <Icon id="q" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Keresés a szabályokban, hősökben, jelzőkben…  (pl. ultimate, kézlimit, méreg)"
          aria-label="Keresés a szabálytárban"
        />
      </div>
      <div className="rt-tabs" role="tablist">
        {RT_TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={!searching && tab === k} onClick={() => chooseTab(k)}>
            {l}
          </button>
        ))}
      </div>

      <div className="pt-1">
        {searching ? (
          <div className="rt-res">
            <div className="px muted">
              {hits.length} TALÁLAT: „{q}”
            </div>
            {hits.slice(0, 40).map((h, i) => (
              <Link key={h.href + h.t + i} className="rt-hit" href={h.href}>
                <span className="chip mut">{h.k}</span>
                <b>
                  <Highlight text={h.t} q={q} />
                </b>
                {h.s && (
                  <span className="muted">
                    <Highlight text={h.s} q={q} />
                  </span>
                )}
              </Link>
            ))}
            {hits.length === 0 && <p className="muted">Nincs találat. Próbáld rövidebb vagy ékezet nélküli szóval.</p>}
          </div>
        ) : tab === "gyors" || tab === "reszletes" || tab === "modok" ? (
          <>
            <p className="muted mb-3">{INTRO[tab]}</p>
            <RuleTiles cat={tab} />
          </>
        ) : tab === "hosok" ? (
          <>
            <input className="input mb-3 max-w-sm" type="search" placeholder="Hős szűrése…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="heroes">
              {RT_HEROES.filter(([hu, en]) => !f || norm(`${hu} ${en}`).includes(f)).map(([hu, en]) => (
                <div key={hu} className="tile">
                  <Art spec={heroArt(en || hu, `${en || hu} hero portrait, Dice Throne style comic art`)} />
                  <div className="in">
                    <h3>{hu}</h3>
                    {en && en !== hu && <span className="sub">{en}</span>}
                  </div>
                </div>
              ))}
            </div>
            <p className="muted mt-3 text-sm">
              {RT_HEROES.length} hős. A hősönkénti részletes lapok (képességek, kártyák) a fordítók engedélyével kerülhetnek ide.
            </p>
          </>
        ) : tab === "jelzok" ? (
          <>
            <p className="muted mb-2">
              {RT_TOKENS.length} állapotjelző és különleges elem. Általános szabályok:{" "}
              <Link href="/szabalytar/allapotjelzok" className="link">
                Állapotjelzők
              </Link>
              .
            </p>
            <input className="input mb-3 max-w-sm" type="search" placeholder="Jelző szűrése…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="rt-chips">
              {[...RT_TOKENS]
                .sort((a, b) => a.localeCompare(b, "hu"))
                .filter((t) => !f || norm(t).includes(f))
                .map((t) => (
                  <span key={t} className="rt-chip">
                    {t}
                  </span>
                ))}
            </div>
          </>
        ) : tab === "gyik" ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="seg2" role="group" aria-label="Kategória">
                {[["", "Mind"], ...Object.entries(RT_FAQCAT)].map(([k, l]) => (
                  <button key={k} type="button" aria-pressed={faqCat === k} onClick={() => setFaqCat(k)}>
                    {l}
                  </button>
                ))}
              </div>
              <span className="muted text-sm">{RT_FAQ.filter((x) => !faqCat || x[0] === faqCat).length} kérdés</span>
            </div>
            <div className="faq">
              {RT_FAQ.filter((x) => !faqCat || x[0] === faqCat).map(([c, fq, a]) => (
                <details key={fq}>
                  <summary>
                    {fq} <span className="chip mut ml-1.5">{RT_FAQCAT[c]}</span>
                  </summary>
                  <div className="text-sm">{a}</div>
                </details>
              ))}
            </div>
          </>
        ) : (
          <div className="rt-idx">
            {ruleIndex().map(([letter, items]) => (
              <div key={letter}>
                <h4>{letter}</h4>
                {items.map(([t, h]) => (
                  <Link key={t} href={h}>
                    {t}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
