import Link from "next/link";
import { routes } from "@/lib/routes";
import { canSeePlayerStats } from "../lib/access";
import { getProfileIdsByKarnyx } from "../lib/data";
import "../player-stats.css";

/**
 * Links a player's name (or `children`, e.g. their avatar) to their stats page, for viewers who
 * may see stats and players who have a profile with that Karnyx name; otherwise renders the
 * content as is. Never use it inside another link (match rows and tiles already link to the match).
 * `decorative`: an avatar next to a name link, hidden from screen readers and Tab so the same
 * target isn't announced twice. Server component.
 */
export async function PlayerLink({
  name,
  children,
  decorative,
}: {
  name: string | null | undefined;
  children?: React.ReactNode;
  decorative?: boolean;
}) {
  const content = children ?? name;
  if (!name || !(await canSeePlayerStats())) return <>{content}</>;
  const id = (await getProfileIdsByKarnyx()).get(name.toLowerCase());
  if (!id) return <>{content}</>;
  return (
    <Link
      className="player-link"
      href={routes.player(id)}
      title={`${name} statisztikája`}
      aria-hidden={decorative || undefined}
      tabIndex={decorative ? -1 : undefined}
    >
      {content}
    </Link>
  );
}
