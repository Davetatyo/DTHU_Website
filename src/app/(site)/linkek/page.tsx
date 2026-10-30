import type { Metadata } from "next";
import { Art, type ArtSpec } from "@/components/Art";

export const metadata: Metadata = { title: "Linkek" };

const LINKS: [string, string, ArtSpec][] = [
  ["Dice Throne", "https://www.dicethrone.com/", { img: "/images/die.webp" }],
  ["Discord szerver", "https://discord.gg/Y5mJ6Sewy", { c1: "#5865f2", c2: "#15131c", g: "link", prompt: "community chat hall in a fantasy tavern" }],
  ["Facebook csoport", "https://www.facebook.com/groups/dicethronehungary", { c1: "#3b6fd8", c2: "#d4ab52", g: "link", prompt: "group of friends playing a dice game" }],
  ["Karnyx", "https://karnyx.app/", { c1: "#5eae4a", c2: "#d4ab52", g: "trophy", prompt: "scoreboard carved in stone" }],
];

export default function LinksPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Linkek</h1>
        </div>
        <p className="lead">Minden, ami a magyar Dice Throne közösséghez kell.</p>
      </div>
      <div className="cards sm">
        {LINKS.map(([name, url, art]) => (
          <a key={name} className="tile" href={url} target="_blank" rel="noopener noreferrer">
            <Art spec={art} />
            <div className="in">
              <h3>{name}</h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
