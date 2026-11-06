import type { Standing } from "@/features/championships/lib/engine/types";

export function StandingsTable({
  standings,
  nameMap,
}: {
  standings: Standing[];
  nameMap: Map<string, string>;
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
            <th className="text-right">Buch</th>
            <th className="text-right">GK</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.id}>
              <td className="text-right font-bold">{s.rank}.</td>
              <td className="font-medium">{nameMap.get(s.id) ?? s.id}</td>
              <td className="text-right">{s.points}</td>
              <td className="text-right">{s.wins}</td>
              <td className="text-right">{s.draws}</td>
              <td className="text-right">{s.losses}</td>
              <td className="text-right">{s.buchholz}</td>
              <td className="text-right">{s.gameDiff > 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted mt-1 text-xs">
        P = pont (döntetlen: fél pont), Gy = győzelem, D = döntetlen, V = vereség, Buch = Buchholz (ellenfelek pontösszege), GK = győzelem-különbség
      </p>
    </div>
  );
}
