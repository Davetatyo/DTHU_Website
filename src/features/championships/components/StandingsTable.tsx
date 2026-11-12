import type { Standing } from "@/features/championships/lib/engine/types";

/** 2.5 → "2,5" (Hungarian decimal comma). */
const num = (n: number) => String(n).replace(".", ",");
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function StandingsTable({
  standings,
  nameMap,
  scoringText,
  showTiebreaks,
}: {
  standings: Standing[];
  nameMap: Map<string, string>;
  /** e.g. "győzelem 3, döntetlen 1, vereség 0, Bye 3 pont" */
  scoringText: string;
  /** Buchholz and HP difference columns: admins only. Players still get the order they decide. */
  showTiebreaks: boolean;
}) {
  if (standings.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="tbl w-full text-sm">
        <thead>
          <tr>
            <th className="text-right">#</th>
            <th>Játékos</th>
            <th className="text-right">P</th>
            <th className="text-right">Gy</th>
            <th className="text-right">D</th>
            <th className="text-right">V</th>
            {showTiebreaks && (
              <>
                <th className="text-right">Buch</th>
                <th className="text-right">ÉK</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.id}>
              <td className="text-right font-bold">{s.rank}.</td>
              <td className="font-medium">{nameMap.get(s.id) ?? s.id}</td>
              <td className="text-right font-bold">{num(s.points)}</td>
              <td className="text-right">{s.wins}</td>
              <td className="text-right">{s.draws}</td>
              <td className="text-right">{s.losses}</td>
              {showTiebreaks && (
                <>
                  <td className="text-right">{num(s.buchholz)}</td>
                  <td className="text-right">{signed(s.hpDiff)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted mt-1 text-xs">
        P = pont ({scoringText}), Gy = győzelem, D = döntetlen, V = vereség.
        {showTiebreaks
          ? " Holtversenyben: Buch = Buchholz (az összes ellenfél pontjainak összege; a Bye a játékos saját pontjaival számít, így nem jár előnnyel vagy hátránnyal), majd ÉK = életerő-különbség (győzelemnél + a megmaradt életerő, vereségnél − az ellenfélé). Ezt a két oszlopot csak az adminok látják."
          : " Holtversenyben az ellenfelek erőssége (Buchholz), majd az életerő-különbség dönt."}
      </p>
    </div>
  );
}
