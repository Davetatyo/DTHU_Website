import { heroColors, heroPortrait } from "@/lib/heroes";

/**
 * A hero as a small round portrait (the Szabálytár's art); heroes without one get a circle in
 * their colours with initials. The name is the tooltip; screen readers get it from the parent.
 * `banned`: greyed out and struck through (a championship match's banned hero).
 */
export function HeroIcon({ hero, banned }: { hero: string; banned?: boolean }) {
  const cls = banned ? "hero-ic ban" : "hero-ic";
  const title = banned ? `Kitiltva: ${hero}` : hero;
  const img = heroPortrait(hero);
  if (img) return <span className={cls} style={{ backgroundImage: `url(${img})` }} title={title} aria-hidden />;
  const [c1, c2] = heroColors(hero);
  const ini = hero
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={cls} style={{ background: `radial-gradient(circle at 50% 30%, ${c1}, ${c2} 80%)` }} title={title} aria-hidden>
      {ini}
    </span>
  );
}

/** A roster as slightly overlapping round portraits; screen readers get the names. */
export function HeroIcons({ heroes }: { heroes: readonly string[] }) {
  if (heroes.length === 0) return null;
  return (
    <span className="hero-ics" role="img" aria-label={heroes.join(", ")}>
      {heroes.map((h) => (
        <HeroIcon key={h} hero={h} />
      ))}
    </span>
  );
}
