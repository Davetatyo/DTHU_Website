import { heroColors, heroPortrait } from "@/lib/heroes";

/**
 * A hero as a small round portrait (the Szabálytár's art); heroes without one get a circle in
 * their colours with initials. The name is the tooltip; screen readers get it from the parent.
 */
export function HeroIcon({ hero }: { hero: string }) {
  const img = heroPortrait(hero);
  if (img) return <span className="hero-ic" style={{ backgroundImage: `url(${img})` }} title={hero} aria-hidden />;
  const [c1, c2] = heroColors(hero);
  const ini = hero
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="hero-ic" style={{ background: `radial-gradient(circle at 50% 30%, ${c1}, ${c2} 80%)` }} title={hero} aria-hidden>
      {ini}
    </span>
  );
}
