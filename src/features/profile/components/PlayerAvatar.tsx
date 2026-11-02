import { HeroAvatar } from "@/components/HeroAvatar";
import { getAvatarUrlsByKarnyx } from "@/features/profile/lib/avatar-store";

/**
 * A player's round avatar anywhere on the site: their uploaded profile picture when they
 * have one (matched by Karnyx name), otherwise the hero artwork as before. Server component;
 * all avatars on a page share one database query.
 */
export async function PlayerAvatar({ name, hero, size }: { name: string | null; hero?: string | null; size?: "md" | "lg" }) {
  const photos = name ? await getAvatarUrlsByKarnyx() : null;
  return <HeroAvatar name={name} hero={hero} size={size} photo={name ? photos?.get(name.toLowerCase()) : null} />;
}
