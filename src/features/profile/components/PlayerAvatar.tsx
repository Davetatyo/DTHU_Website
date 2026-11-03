import { HeroAvatar } from "@/components/HeroAvatar";
import { getAvatarUrlsByKarnyx } from "@/features/profile/lib/avatar-store";
import { getOwnTestBadge } from "@/features/profile/lib/test-badge";
import { BadgeOverlay } from "./BadgedAvatar";

/**
 * A player's round avatar anywhere on the site: their uploaded profile picture when they
 * have one (matched by Karnyx name), otherwise the hero artwork as before. Server component;
 * all avatars on a page share one database query.
 */
export async function PlayerAvatar({ name, hero, size }: { name: string | null; hero?: string | null; size?: "md" | "lg" }) {
  const photos = name ? await getAvatarUrlsByKarnyx() : null;
  const avatar = <HeroAvatar name={name} hero={hero} size={size} photo={name ? photos?.get(name.toLowerCase()) : null} />;
  // Admin badge try-on: only on the admin's own picture, only for them (lib/test-badge).
  const badge = await getOwnTestBadge(name);
  if (!badge) return avatar;
  return (
    <BadgeOverlay badge={badge} footprint={FOOTPRINT[size ?? "sm"]}>
      {avatar}
    </BadgeOverlay>
  );
}

/** The avatar sizes in globals.css (.av, .av.md, .av.lg). */
const FOOTPRINT = { sm: 38, md: 56, lg: 84 } as const;
