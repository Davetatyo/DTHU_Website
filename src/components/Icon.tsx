export type IconId = "die" | "swords" | "cal" | "trophy" | "scroll" | "ticket" | "chest" | "q" | "link" | "book" | "gem";

/** A line icon from the sprite in components/site/IconSprite.tsx. */
export function Icon({ id, className }: { id: IconId; className?: string }) {
  return (
    <svg className={className} aria-hidden>
      <use href={`#i-${id}`} />
    </svg>
  );
}
