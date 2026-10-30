import { heroColors, heroImage } from "@/lib/heroes";

/** Round avatar for a player: their hero's artwork, or a gradient in the hero's colours with initials. */
export function HeroAvatar({
  name,
  hero,
  size,
}: {
  name: string | null;
  hero?: string | null;
  size?: "md" | "lg";
}) {
  const cls = `av${size ? ` ${size}` : ""}`;
  if (!name) return <span className={cls} style={{ background: "#2a2533" }} aria-hidden />;
  const img = heroImage(hero);
  if (img) return <span className={cls} style={{ backgroundImage: `url(${img})` }} title={hero ?? undefined} aria-hidden />;
  const [c1, c2] = heroColors(hero);
  return (
    <span className={cls} style={{ background: `radial-gradient(circle at 50% 30%, ${c1}, ${c2} 75%)` }} title={hero ?? undefined} aria-hidden>
      <span className="ini">{name.slice(0, 2).toUpperCase()}</span>
    </span>
  );
}
