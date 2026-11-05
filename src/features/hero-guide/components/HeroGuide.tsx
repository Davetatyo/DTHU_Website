"use client";

import { useState } from "react";
import { EntryView } from "@/features/rulebook/components/EntryView";
import type { RenderedEntry } from "@/features/rulebook/lib/content";

export type GuideHero = {
  /** Name on the player's roster (English). */
  name: string;
  id: string;
  /** The hero's Szabálytár entry; null if the name isn't a hero we know. */
  entry: RenderedEntry | null;
};

export type GuideSide = { name: string; avatar: React.ReactNode; isMe: boolean; heroes: GuideHero[] };

/** Pick a player, pick one of their heroes, read that hero's Szabálytár entry. */
export function HeroGuide({ sides }: { sides: [GuideSide, GuideSide] }) {
  const [sideIndex, setSideIndex] = useState(0);
  const [heroBySide, setHeroBySide] = useState([0, 0]);
  const side = sides[sideIndex];
  const hero = side.heroes[heroBySide[sideIndex]];
  const isPlaying = sides.some((s) => s.isMe);

  return (
    <div className="hs">
      <div className="hs-players" role="group" aria-label="Játékos">
        {sides.map((s, i) => (
          <button key={s.name} type="button" className="hs-player" aria-pressed={i === sideIndex} onClick={() => setSideIndex(i)}>
            {s.avatar}
            <span className="hs-player-text">
              <b>{s.name}</b>
              {isPlaying && <small>{s.isMe ? "te" : "ellenfeled"}</small>}
            </span>
          </button>
        ))}
      </div>

      <div className="hs-label">{side.isMe ? "A te hőseid" : `${side.name} hősei`}</div>
      {side.heroes.length === 0 && <p className="muted">Ennek a játékosnak még nincsenek hősei megadva.</p>}
      {side.heroes.length > 0 && (
        <div className="hs-heroes" role="group" aria-label="Hős">
          {side.heroes.map((h, i) => (
            <button
              key={h.id}
              type="button"
              className="hs-hero"
              aria-pressed={i === heroBySide[sideIndex]}
              onClick={() => setHeroBySide((all) => all.map((v, k) => (k === sideIndex ? i : v)))}
            >
              {h.entry && (
                // eslint-disable-next-line @next/next/no-img-element -- fixed-size portrait, already optimised
                <img src={`/szabalytar/img/heroes/${h.id}.webp`} alt="" width={64} height={64} />
              )}
              <b>{h.entry?.title ?? h.name}</b>
              {h.entry && h.entry.title !== h.name && <small>{h.name}</small>}
            </button>
          ))}
        </div>
      )}

      {hero && (
        <div className="hs-entry rp-page rp-wide">
          {hero.entry ? <EntryView key={hero.entry.path} entry={hero.entry} /> : <p className="muted">Ehhez a hőshöz még nincs leírás a Szabálytárban.</p>}
        </div>
      )}
    </div>
  );
}
