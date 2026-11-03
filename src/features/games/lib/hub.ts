// The games on the Játékok page, in order. Each game has its own page under /jatekok.

import { routes } from "@/lib/routes";

export type GameCard = {
  id: string;
  name: string;
  blurb: string;
  /** Page of a playable game; none while it's coming. */
  href?: string;
  picture?: string;
  badge: "Új" | "Hamarosan";
};

export const GAMES: GameCard[] = [
  {
    id: "tactician",
    name: "Taktikai Előny",
    blurb: "Gondolj egy Dice Throne hősre. A Hadvezér legfeljebb 10 kérdésből kitalálja, kire gondoltál.",
    href: routes.tacticianGame,
    picture: "/jatekok/hadvezer-portre.jpg",
    badge: "Új",
  },
  {
    id: "dice",
    name: "Kockázat",
    blurb: "Kockapóker a Barbár ellen: 5 kocka, 3 dobás. Csak épp ő is neked szurkol…",
    href: routes.diceGame,
    picture: "/jatekok/barbar-harcos.jpg",
    badge: "Új",
  },
  {
    id: "spot",
    name: "Szemfüles",
    blurb: "Keresd meg a 10 különbséget 60 másodperc alatt! Találat +10, tévedés −5 pont.",
    href: routes.spotGame,
    picture: "/jatekok/szemfules/tea-party-1.jpg",
    badge: "Új",
  },
  {
    id: "quiz",
    name: "Kvíz",
    blurb: "Szabályok, hősök, sebzésszámítás: egyre nehezedő szintek. Hamarosan.",
    badge: "Hamarosan",
  },
];
