import Link from "next/link";
import type { ReactNode } from "react";
import { publicStorageUrl } from "@/lib/storage-url";
import { videoEmbedUrl, type ContentBlock } from "@/lib/content-blocks";
import { Gallery } from "./Gallery";
import { InlineText } from "./InlineText";
import "./content.css";

/** What an "Esemény kártya" block shows; the page looks the events up and passes them in. */
export type EmbeddedEvent = { title: string; dateLabel: string; href: string | null; external: boolean; cover: string | null };

/**
 * The content blocks of an event or news page. Text never becomes HTML (inline marks become
 * React elements), links were checked to be http(s), videos only from YouTube/Twitch.
 * `host` is the site's domain, which Twitch embeds require.
 */
export function ContentBody({
  blocks,
  bucket,
  host,
  events = {},
  extras = {},
}: {
  blocks: ContentBlock[];
  bucket: string;
  host: string;
  events?: Record<string, EmbeddedEvent>;
  /** Interactive parts a feature renders itself, keyed "poll:<id>" and "pollresult:<id>". */
  extras?: Record<string, ReactNode>;
}) {
  if (blocks.length === 0) return null;
  const url = (path: string) => publicStorageUrl(bucket, path) ?? "";
  return (
    <div className="cb-body">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h":
            return <h2 key={i}>{b.text}</h2>;
          case "p":
            return (
              <p key={i}>
                <InlineText text={b.text} />
              </p>
            );
          case "list": {
            const Tag = b.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={b.ordered ? "cb-ol" : "cb-ul"}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <InlineText text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote key={i} className="cb-quote">
                <p>
                  <InlineText text={b.text} />
                </p>
                {b.by && <footer>– {b.by}</footer>}
              </blockquote>
            );
          case "box":
            return (
              <div key={i} className={`cb-box ${b.tone}`} role="note">
                <InlineText text={b.text} />
              </div>
            );
          case "img":
            return (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage */}
                <img src={url(b.path)} alt={b.caption ?? ""} loading="lazy" />
                {b.caption && <figcaption>{b.caption}</figcaption>}
              </figure>
            );
          case "gallery":
            return <Gallery key={i} urls={b.paths.map(url)} />;
          case "video":
            return (
              <div key={i} className="cb-video">
                <iframe
                  src={videoEmbedUrl(b.video, host)}
                  title={b.video.provider === "youtube" ? "YouTube videó" : "Twitch videó"}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            );
          case "link":
            return (
              <p key={i}>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  {b.label || new URL(b.url).hostname} ↗
                </a>
              </p>
            );
          case "event": {
            const ev = events[b.id];
            if (!ev) return null;
            const body = (
              <>
                {ev.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage
                  <img src={ev.cover} alt="" />
                ) : (
                  <span className="cb-event-ph" aria-hidden />
                )}
                <span className="min-w-0">
                  <small className="kicker">Esemény</small>
                  <b>{ev.title}</b>
                  <span className="muted block text-sm">{ev.dateLabel}</span>
                </span>
              </>
            );
            if (!ev.href) return <div key={i} className="cb-event">{body}</div>;
            return ev.external ? (
              <a key={i} href={ev.href} target="_blank" rel="noopener noreferrer" className="cb-event">
                {body}
              </a>
            ) : (
              <Link key={i} href={ev.href} className="cb-event">
                {body}
              </Link>
            );
          }
          case "poll":
            return <div key={i}>{extras[`poll:${b.poll.id}`] ?? null}</div>;
          case "pollresult":
            return <div key={i}>{extras[`pollresult:${b.id}`] ?? null}</div>;
          case "hr":
            return <hr key={i} className="cb-hr" />;
        }
      })}
    </div>
  );
}
