"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { routes } from "@/lib/routes";
import { SubmitButton } from "@/components/SubmitButton";
import { createNewsFromPoll, refreshPoll, votePoll } from "../actions/polls";
import { OTHER, type PollResults } from "../lib/polls";
import type { PollState } from "../lib/polls-data";
import "../news.css";

const REFRESH_MS = 10_000;
const when = (iso: string) => new Date(iso).toLocaleString("hu-HU", { month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });

/** Result bars (also used by "Szavazás eredménye" blocks). */
export function PollResultsView({ results, mine = [] }: { results: PollResults; mine?: string[] }) {
  const rows = [...results.options, ...(results.other ? [{ id: OTHER, label: "Egyéb", count: results.other.count, pct: results.other.pct }] : [])];
  return (
    <div className="poll-results">
      {rows.map((r) => (
        <div key={r.id} className={`poll-bar${mine.includes(r.id) ? " mine" : ""}`}>
          <span className="poll-bar-fill" style={{ width: `${r.pct}%` }} aria-hidden />
          <span className="poll-bar-label">
            {r.label}
            {mine.includes(r.id) && <small> · a te szavazatod</small>}
          </span>
          <span className="poll-bar-num">
            {r.pct}% <small>({r.count})</small>
          </span>
        </div>
      ))}
      <p className="muted text-sm">{results.voters ? `${results.voters} szavazó` : "Még nincs szavazat."}</p>
      {results.other && results.other.answers.length > 0 && (
        <details className="poll-other">
          <summary>„Egyéb” válaszok ({results.other.answers.length})</summary>
          <ul>
            {results.other.answers.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * A poll in an article: vote (logged-in users, one vote, changeable until closing), then live
 * results that refresh every 10 seconds while the page is visible.
 */
export function PollCard({ initial }: { initial: PollState }) {
  const [state, setState] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [choices, setChoices] = useState<string[]>(initial.myVote?.choices ?? []);
  const [other, setOther] = useState(initial.myVote?.other_text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { poll, closed, loggedIn, isAdmin, myVote, results } = state;

  // Live results: refresh while results are on screen (and once more when the poll closes).
  useEffect(() => {
    if (!results && !isAdmin && closed) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      refreshPoll(poll.id).then((r) => r.state && setState(r.state));
    };
    const timer = window.setInterval(tick, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [poll.id, results, isAdmin, closed]);

  const toggle = (id: string) =>
    setChoices((c) => (poll.multi ? (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]) : [id]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await votePoll(poll.id, choices, other);
      if (r.state) setState(r.state);
      if (r.error) setError(r.error);
      else setEditing(false);
    });
  }

  const showForm = loggedIn && !closed && (!myVote || editing);
  const choiceList = [...poll.options, ...(poll.allow_other ? [{ id: OTHER, label: "Egyéb" }] : [])];

  return (
    <section className="poll" aria-label="Szavazás">
      <div className="poll-head">
        <span className="kicker">Szavazás</span>
        <span className={`chip ${closed ? "mut" : "ok"}`}>{closed ? "Lezárult" : `Lezárul: ${when(poll.closes_at)}`}</span>
      </div>
      <h3 className="poll-q">{poll.question}</h3>

      {showForm && (
        <form onSubmit={submit} className="space-y-2">
          <p className="muted text-sm">{poll.multi ? "Több lehetőséget is választhatsz." : "Egy lehetőséget választhatsz."}</p>
          {choiceList.map((o) => (
            <label key={o.id} className="poll-choice">
              <input type={poll.multi ? "checkbox" : "radio"} name="choice" checked={choices.includes(o.id)} onChange={() => toggle(o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
          {choices.includes(OTHER) && (
            <input className="input" value={other} maxLength={200} placeholder="Írd be a válaszod" onChange={(e) => setOther(e.target.value)} />
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn" disabled={pending || choices.length === 0}>
              {pending ? "Mentés…" : myVote ? "Szavazat módosítása" : "Szavazok"}
            </button>
            {editing && (
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                Mégse
              </button>
            )}
          </div>
        </form>
      )}

      {!loggedIn && !closed && (
        <p>
          <Link href={routes.login} className="btn btn-discord">
            Lépj be a szavazáshoz
          </Link>
        </p>
      )}

      {results ? (
        <PollResultsView results={results} mine={myVote?.choices} />
      ) : (
        !showForm && loggedIn && !closed && <p className="muted text-sm">Az eredményt szavazás után látod.</p>
      )}
      {!results && !loggedIn && !closed && <p className="muted text-sm">Az eredményt szavazás után láthatod.</p>}

      {myVote && !closed && !editing && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
          Szavazatom módosítása
        </button>
      )}
      {error && <p className="alert-error">{error}</p>}

      {isAdmin && (
        <form action={createNewsFromPoll} className="poll-admin">
          <input type="hidden" name="poll_id" value={poll.id} />
          <span className="muted text-sm">Admin: {closed ? "a szavazás lezárult." : "a szavazás még fut; az eredményhír a mostani állást mutatja, és zárásig frissül."}</span>
          <SubmitButton className="btn btn-secondary btn-sm">Új hír az eredményből</SubmitButton>
        </form>
      )}
    </section>
  );
}
