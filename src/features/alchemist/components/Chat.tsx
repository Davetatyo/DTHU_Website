"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { answerById, GREETING, reply, SUGGESTIONS, type BotReply } from "../lib/reply";
import "../alchemist.css";

type Msg = { bot: true; r: BotReply } | { bot: false; text: string };

function BotBubble({ r, onAsk, onPick, onSubmit }: { r: BotReply; onAsk: (q: string) => void; onPick: (id: string) => void; onSubmit: (q: string) => void }) {
  return (
    <div className="a-bub">
      {/* Answers come from our own knowledge base (data/knowledge.ts). */}
      <span dangerouslySetInnerHTML={{ __html: r.html }} />
      {r.link &&
        (r.link[0].startsWith("http") ? (
          <a className="a-more" href={r.link[0]} target="_blank" rel="noopener noreferrer">
            {r.link[1]} ›
          </a>
        ) : (
          <Link className="a-more" href={r.link[0]}>
            {r.link[1]} ›
          </Link>
        ))}
      {r.choices && (
        <div className="a-chips">
          {r.choices.map((c) => (
            <button key={c.id} type="button" className="a-chip" onClick={() => onPick(c.id)}>
              {c.title}
            </button>
          ))}
        </div>
      )}
      {r.suggestions && (
        <div className="a-chips">
          {r.suggestions.map((s) => (
            <button key={s} type="button" className="a-chip" onClick={() => onAsk(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {r.unanswered && (
        <button type="button" className="btn btn-sm mt-2" onClick={() => onSubmit(r.unanswered!)}>
          Kérdés beküldése az adminoknak
        </button>
      )}
    </div>
  );
}

/** Chat with the Alchemist: rule-based answers, no AI. */
export function Chat() {
  const [log, setLog] = useState<Msg[]>([{ bot: true, r: { html: GREETING } }]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log, typing]);

  function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setLog((l) => [...l, { bot: false, text }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setLog((l) => [...l, { bot: true, r: reply(text) }]);
    }, 450 + Math.random() * 400);
  }

  function pick(id: string) {
    const r = answerById(id);
    if (r) setLog((l) => [...l, { bot: true, r }]);
  }

  // Until there is a backend for it, unanswered questions are kept in this browser.
  function submit(q: string) {
    try {
      const list = JSON.parse(localStorage.getItem("dthu:unanswered") ?? "[]");
      list.push({ q, t: new Date().toISOString() });
      localStorage.setItem("dthu:unanswered", JSON.stringify(list));
    } catch {}
    setLog((l) => [...l, { bot: true, r: { html: "Felírtam a kérdésed a jegyzetfüzetembe. Az adminok hamarosan megtanítanak rá!" } }]);
  }

  return (
    <div className="a-wrap">
      <div className="a-side">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative portrait */}
        <img src="/images/alchemist.webp" alt="Az Alkimista" width={844} height={720} />
        <div>
          <div className="a-name">Az Alkimista</div>
          <div className="muted text-sm">Szabályfőzetmester · előre megírt válaszok, AI nélkül</div>
        </div>
      </div>
      <section className="a-chat" aria-label="Beszélgetés az Alkimistával">
        <div className="a-log" ref={logRef} aria-live="polite">
          {log.map((m, i) =>
            m.bot ? (
              <div key={i} className="a-msg bot">
                <span className="a-av" aria-hidden />
                <BotBubble r={m.r} onAsk={ask} onPick={pick} onSubmit={submit} />
              </div>
            ) : (
              <div key={i} className="a-msg me">
                <div className="a-bub">{m.text}</div>
              </div>
            ),
          )}
          {typing && (
            <div className="a-msg bot">
              <span className="a-av" aria-hidden />
              <div className="a-bub a-dots">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>
        <div className="a-sug">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="a-chip" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
        <form
          className="a-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
            setInput("");
          }}
        >
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            placeholder="Írd ide a kérdésed… (pl. mennyi lap lehet a kezemben?)"
            aria-label="Kérdés"
          />
          <button className="btn" type="submit">
            Küldés
          </button>
        </form>
      </section>
    </div>
  );
}
