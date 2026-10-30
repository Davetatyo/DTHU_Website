import type { Metadata } from "next";
import { Rulebook } from "@/features/rulebook/components/Rulebook";

export const metadata: Metadata = { title: "Szabálytár" };

export default async function RulebookPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Szabálytár</h1>
        </div>
        <p className="lead">A Dice Throne szabályai magyarul, gyors kereséssel. Minden szabálynak saját linkje van.</p>
      </div>
      <Rulebook initialTab={tab ?? "gyors"} />
      <p className="muted border-t border-dashed pt-2 text-sm" style={{ borderColor: "var(--line)" }}>
        Forrás: a{" "}
        <a href="https://dice-throne-rulepop-hu.vercel.app/" target="_blank" rel="noopener noreferrer" className="link">
          Dice Throne Rulepop magyar rajongói fordítása
        </a>
        , saját szavakkal összefoglalva. Nem hivatalos tartalom; a Dice Throne a Roxley Games védjegye.
      </p>
    </div>
  );
}
