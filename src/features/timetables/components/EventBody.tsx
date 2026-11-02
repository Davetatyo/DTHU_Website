import { publicStorageUrl } from "@/lib/storage-url";
import { EVENT_IMAGE_BUCKET, type EventBlock } from "../lib/events";

/**
 * An event page's content blocks. Text is rendered as plain text (never as HTML), with its
 * line breaks; links were checked to be http(s) when saved.
 */
export function EventBody({ blocks }: { blocks: EventBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className="ev-body">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h":
            return <h2 key={i}>{b.text}</h2>;
          case "p":
            return <p key={i}>{b.text}</p>;
          case "img":
            return (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage */}
                <img src={publicStorageUrl(EVENT_IMAGE_BUCKET, b.path) ?? ""} alt={b.caption ?? ""} loading="lazy" />
                {b.caption && <figcaption>{b.caption}</figcaption>}
              </figure>
            );
          case "link":
            return (
              <p key={i}>
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  {b.label || new URL(b.url).hostname} ↗
                </a>
              </p>
            );
        }
      })}
    </div>
  );
}
