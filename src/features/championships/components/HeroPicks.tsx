import { HeroIcon } from "@/components/HeroIcon";

/** A reported match side: the hero played and the one banned, as icons (names in the tooltips). */
export function HeroPicks({ pick, ban }: { pick?: string | null; ban?: string | null }) {
  if (!pick && !ban) return null;
  const label = [pick && `Játszott hős: ${pick}`, ban && `kitiltott hős: ${ban}`].filter(Boolean).join(", ");
  return (
    <span className="hero-ics hero-picks" role="img" aria-label={label}>
      {pick && <HeroIcon hero={pick} />}
      {ban && <HeroIcon hero={ban} banned />}
    </span>
  );
}
