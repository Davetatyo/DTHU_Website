"use client";

import { useEffect, useRef, useState } from "react";
import { splitHeroBody } from "../lib/hero-media";
import { RULEBOOK_PATH } from "../lib/pages";
import { isRelevant } from "../lib/render";
import type { RenderedEntry } from "../lib/content";
import { HeroMedia } from "./HeroMedia";

/** RulePop's flags from the controls inside `el` (game mode, FAQ category), plus the defaults. */
function activeFlags(el: HTMLElement): Set<string> {
  const flags = new Set(["g-vs", "h-all"]);
  el.querySelectorAll<HTMLInputElement>("input[type=radio]:checked").forEach((i) => flags.add(i.value));
  return flags;
}

/** The entry's body: our own trusted HTML from content/, with RulePop's "dynamic rules". */
function EntryBody({ html, media }: { html: string; media: RenderedEntry["media"] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const refresh = () => {
      const flags = activeFlags(el);
      el.querySelectorAll<HTMLElement>("[data-relevance]").forEach((n) => {
        n.hidden = !isRelevant(n.dataset.relevance ?? "", flags);
      });
    };
    el.addEventListener("change", refresh);
    return () => el.removeEventListener("change", refresh);
  }, []);
  if (media.length === 0) return <div ref={ref} className="rp rp-body" dangerouslySetInnerHTML={{ __html: html }} />;
  const [top, rest] = splitHeroBody(html);
  return (
    <div ref={ref} className="rp rp-body">
      <div dangerouslySetInnerHTML={{ __html: top }} />
      <HeroMedia items={media} />
      <div dangerouslySetInnerHTML={{ __html: rest }} />
    </div>
  );
}

/** Title (click copies the entry's link, as on RulePop), "see also" links and the body. */
export function EntryView({ entry }: { entry: RenderedEntry }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  function copy() {
    navigator.clipboard?.writeText(`${window.location.origin}${RULEBOOK_PATH}/${entry.path}`).then(() => setCopied(true));
  }

  return (
    <article className="rp-entry">
      <header className="rp-head rp">
        <h2 title="Link másolása a vágólapra" onClick={copy}>
          <span dangerouslySetInnerHTML={{ __html: entry.titleHtml }} />
          <svg className="rp-link-icon" viewBox="0 0 24 24" aria-hidden>
            <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {copied && <span className="rp-copied">Link másolva!</span>}
        </h2>
        {entry.seeAlsoHtml && <ul className="see-also" dangerouslySetInnerHTML={{ __html: entry.seeAlsoHtml }} />}
      </header>
      <EntryBody key={entry.path} html={entry.bodyHtml} media={entry.media} />
    </article>
  );
}
