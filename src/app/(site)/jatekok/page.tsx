import type { Metadata } from "next";
import { GamesHub } from "@/features/games/components/GamesHub";

export const metadata: Metadata = { title: "Játékok" };

export default function GamesPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Játékok</h1>
        </div>
        <p className="lead">Dice Throne játékok a közösségnek. Hamarosan újabbak is érkeznek.</p>
      </div>
      <GamesHub />
    </div>
  );
}
