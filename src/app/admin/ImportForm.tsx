"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { InfoTip } from "@/components/InfoTip";
import { byeWarnings, parseByeNames, parseKarnyxPaste } from "@/lib/karnyx";
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
  const [byeText, setByeText] = useState("");
  const result = useMemo(() => parseKarnyxPaste(text), [text]);
  const byes = useMemo(() => parseByeNames(byeText), [byeText]);
  const byeProblems = useMemo(() => byeWarnings(byes, result.pairings), [byes, result.pairings]);
  const known = useMemo(() => new Set(knownPlayers.map((n) => n.toLowerCase())), [knownPlayers]);
  const isNew = (name: string) => knownPlayers.length > 0 && !known.has(name.toLowerCase());
  const warnings = [...result.warnings, ...byeProblems];

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

      <div>
        <label className="label" htmlFor="bye">
          Bye (pihenő játékos)
          <InfoTip text="A Karnyx a pihenő játékost nem másolja ki a párosítással. Írd be a nevét: a forduló indításakor Bye-t kap, és a Discord üzenet végén a Pihen: sorban szerepel." />
        </label>
        <input
          id="bye"
          name="bye"
          className="input max-w-sm"
          list="bye-players"
          autoComplete="off"
          value={byeText}
          onChange={(e) => setByeText(e.target.value)}
          placeholder="Karnyx név, pl. moi"
        />
        <datalist id="bye-players">
          {knownPlayers.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <p className="muted mt-1 text-xs">
          A Karnyx a Bye-t nem másolja ki a párosítással, ezért itt add meg. Több név esetén vesszővel válaszd el.
        </p>
      </div>

      {warnings.length > 0 && (
        <ul className="alert-error list-inside list-disc text-sm">
          {warnings.map((w) => (
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
                      <span className="muted">Bye</span>
                    )}
                  </td>
                </tr>
              ))}
              {byes.map((name) => (
                <tr key={`bye-${name}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="py-1 pr-2">Bye</td>
                  <td className="py-1 pr-2">
                    <strong>{name}</strong>
                    {isNew(name) && <span className="badge badge-proposed ml-1">új</span>}
                  </td>
                  <td className="muted py-1">pihen</td>
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
            <InfoTip text="Alapból egy hét múlva. Időpontot csak eddig lehet javasolni. Később az admin oldalon módosítható." />
          </label>
          <input id="deadline" type="datetime-local" name="deadline" className="input" defaultValue={defaultDeadline} required />
        </div>
        <SubmitButton disabled={result.pairings.length === 0 || byeProblems.length > 0}>
          {nextRound}. forduló indítása ({result.pairings.length} meccs{byes.length ? ` + ${byes.length} Bye` : ""})
        </SubmitButton>
      </div>
      <p className="muted text-xs">Az indítás lezárja az előző fordulót, és kiküldi a párosításokat Discordra.</p>
    </form>
  );
}
