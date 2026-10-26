"use client";

import { useMemo, useState } from "react";
import { parseKarnyxPaste } from "@/lib/karnyx";
import { importRound } from "./actions";

export function ImportForm({
  tournamentId,
  nextRound,
  defaultDeadline,
  knownPlayers,
}: {
  tournamentId: string;
  nextRound: number;
  defaultDeadline: string;
  knownPlayers: string[];
}) {
  const [text, setText] = useState("");
  const result = useMemo(() => parseKarnyxPaste(text), [text]);
  const known = useMemo(() => new Set(knownPlayers.map((n) => n.toLowerCase())), [knownPlayers]);
  const isNew = (name: string) => knownPlayers.length > 0 && !known.has(name.toLowerCase());

  return (
    <form action={importRound} className="space-y-3">
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <p className="muted text-sm">
        Karnyxban jelöld ki a forduló párosításait (hősök + nevek), másold ki, és illeszd be ide. Az előnézetben
        ellenőrizd, hogy jók-e a párok.
      </p>
      <textarea
        name="text"
        className="input font-mono text-sm"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Santa Avatar\nKrampus Avatar\nHeadless Horseman Avatar\nEngineerGnome\n…"}
      />

      {result.warnings.length > 0 && (
        <ul className="alert-error list-inside list-disc text-sm">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {result.pairings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="muted text-left">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Játékos A</th>
                <th className="py-1">Játékos B</th>
              </tr>
            </thead>
            <tbody>
              {result.pairings.map((p) => (
                <tr key={p.tableNo} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-1 pr-2">{p.tableNo}.</td>
                  <td className="py-1 pr-2">
                    <strong>{p.a.name}</strong>
                    {isNew(p.a.name) && <span className="badge badge-proposed ml-1">új</span>}
                    <div className="muted text-xs">{p.a.heroes.join(", ")}</div>
                  </td>
                  <td className="py-1">
                    {p.b ? (
                      <>
                        <strong>{p.b.name}</strong>
                        {isNew(p.b.name) && <span className="badge badge-proposed ml-1">új</span>}
                        <div className="muted text-xs">{p.b.heroes.join(", ")}</div>
                      </>
                    ) : (
                      <span className="muted">erőnyerő</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="deadline">
            Határidő
          </label>
          <input id="deadline" type="datetime-local" name="deadline" className="input" defaultValue={defaultDeadline} required />
        </div>
        <button className="btn" disabled={result.pairings.length === 0}>
          {nextRound}. forduló indítása ({result.pairings.length} meccs)
        </button>
      </div>
      <p className="muted text-xs">Az indítás lezárja az előző fordulót, és kiküldi a párosításokat Discordra.</p>
    </form>
  );
}
