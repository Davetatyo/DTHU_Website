"use client";

import { useEffect, useState } from "react";
import { routes } from "@/lib/routes";
import type { LiveCard } from "../lib/data";
import "../live-banner.css";

const REFRESH_MS = 45_000;

/** The live cards. Keeps itself up to date while the page stays open, so a game shows up unasked. */
export function LiveBannerCards({ initial }: { initial: LiveCard[] }) {
  const [cards, setCards] = useState(initial);

  useEffect(() => {
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch(routes.liveNow, { cache: "no-store" });
        if (response.ok) setCards(((await response.json()) as { cards: LiveCard[] }).cards);
      } catch {
        // Offline for a moment: keep what is on screen and try again at the next refresh.
      }
    }
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  if (cards.length === 0) return null;

  return (
    <div className="live-cards" aria-live="polite">
      {cards.map((card) => (
        <a key={card.matchId} className="live-card" href={card.href} {...(card.external ? { target: "_blank", rel: "noreferrer" } : {})}>
          <span className="live-tag">
            <i aria-hidden />
            Élő adás
          </span>
          <span className="live-match">
            <b>
              {card.playerA}
              {card.playerB && <> – {card.playerB}</>}
            </b>
            <small>
              {card.tableNo}. asztal
              {card.channelName && <> · {card.channelName}</>}
            </small>
          </span>
          <span className="live-go">{card.external ? "Nézd a Discordon" : "Meccs oldala"} ›</span>
        </a>
      ))}
    </div>
  );
}
