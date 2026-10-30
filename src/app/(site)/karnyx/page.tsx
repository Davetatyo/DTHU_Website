import type { Metadata } from "next";
import { Art } from "@/components/Art";
import { KarnyxBookmarklet } from "@/features/karnyx/components/KarnyxBookmarklet";
import { KarnyxLauncher } from "@/features/karnyx/components/KarnyxLauncher";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Karnyx" };

// Admin-only (middleware + requireAdmin). Karnyx can't be embedded, see features/karnyx/README.md.
export default async function KarnyxPage() {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <div>
        <div className="sec-h">
          <h1>Karnyx</h1>
        </div>
        <p className="lead">A párosítások és eredmények helye. Ezt a fület csak az adminok látják.</p>
      </div>

      <div className="tile" style={{ minHeight: 200 }}>
        <Art spec={{ c1: "#5eae4a", c2: "#d4ab52", g: "trophy", prompt: "scoreboard carved in stone" }} />
        <div className="in">
          <span className="k">karnyx.app</span>
          <h3 className="text-2xl">Párosítások, eredmények, tabella</h3>
          <KarnyxLauncher />
        </div>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Párosítások átvétele <span className="chip warn ml-1">kísérlet</span>
        </h2>
        <p className="muted text-sm">
          Másolás-beillesztés helyett: egy könyvjelző a Karnyx oldalán kiolvassa a forduló párosításait (hősökkel együtt),
          pontosan abban a formában, amit az Admin felület vár. Csak a te böngésződben fut, a Karnyx belépésed nem kerül
          sehova.
        </p>
        <KarnyxBookmarklet />
      </section>

      <div className="card space-y-2 text-sm">
        <p>
          <b>Miért nem itt jelenik meg?</b> A Karnyx nem engedi, hogy más oldal beágyazza (a böngésző letiltja), ezért
          külön ablakban nyílik. A beágyazott oldal tartalmát egyébként sem olvashatná ki a mi oldalunk.
        </p>
      </div>
    </div>
  );
}
