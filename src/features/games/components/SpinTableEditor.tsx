"use client";

import { useState } from "react";
import { basisPoints, spinEv, spinTableProblems, type SpinPrize } from "@/features/shop/lib/economy";

/**
 * Edits the spin table inside the settings form: rows of name, chance (%) and coins. It posts
 * the table as JSON in a hidden field and shows the sum and the expected value live. The server
 * checks the same rules again (spinTableProblems); an expected value above the limit is only a
 * warning, as the spec asks.
 */
export function SpinTableEditor({ initial, maxEv }: { initial: SpinPrize[]; maxEv: number }) {
  const [rows, setRows] = useState(initial.map((r) => ({ label: r.label, chance: String(r.chance), coins: String(r.coins) })));
  const table: SpinPrize[] = rows.map((r) => ({
    label: r.label,
    chance: Number(r.chance.replace(",", ".")),
    coins: Number(r.coins),
  }));
  const problems = spinTableProblems(table);
  const sum = table.reduce((n, p) => n + (Number.isFinite(p.chance) ? basisPoints(p.chance) : 0), 0) / 100;
  const ev = problems.length === 0 ? spinEv(table) : null;
  const set = (i: number, k: "label" | "chance" | "coins", v: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div className="space-y-2">
      <input type="hidden" name="spin_table" value={JSON.stringify(table)} />
      <div className="overflow-x-auto">
        <table className="odds min-w-[420px]">
          <thead>
            <tr>
              <th>Mező neve</th>
              <th className="n">Esély (%)</th>
              <th className="n">DTHU coin</th>
              <th aria-label="Törlés" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <input className="input" value={r.label} maxLength={40} onChange={(e) => set(i, "label", e.target.value)} aria-label={`${i + 1}. mező neve`} />
                </td>
                <td className="n">
                  <input className="input w-24 text-right" inputMode="decimal" value={r.chance} onChange={(e) => set(i, "chance", e.target.value)} aria-label={`${i + 1}. mező esélye`} />
                </td>
                <td className="n">
                  <input className="input w-20 text-right" inputMode="numeric" value={r.coins} onChange={(e) => set(i, "coins", e.target.value)} aria-label={`${i + 1}. mező coin`} />
                </td>
                <td>
                  <button type="button" className="btn btn-quiet btn-sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} disabled={rows.length <= 2}>
                    Törlés
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRows((rs) => [...rs, { label: "", chance: "0", coins: "0" }])} disabled={rows.length >= 12}>
          + Új mező
        </button>
        <span className={sum === 100 ? "" : "font-bold"} style={{ color: sum === 100 ? undefined : "var(--danger)" }}>
          Összesen: {sum.toLocaleString("hu-HU")}%
        </span>
        {ev !== null && (
          <span style={{ color: ev > maxEv ? "var(--warn)" : undefined }}>
            Várható érték: <b>{ev.toFixed(2)}</b> coin / pörgetés
            {ev > maxEv && ` (a ${maxEv} határ felett: mentheted, de nagyon bőkezű)`}
          </span>
        )}
      </div>
      {problems.length > 0 && <p className="alert-error text-sm">{problems.join(" ")}</p>}
    </div>
  );
}
