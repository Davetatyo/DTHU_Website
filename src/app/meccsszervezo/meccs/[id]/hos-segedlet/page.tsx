import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HeroGuide, type GuideSide } from "@/features/hero-guide/components/HeroGuide";
import { canOpenHeroGuide, heroIdFromName, opponentFirst } from "@/features/hero-guide/lib/hero-guide";
import "@/features/hero-guide/hero-guide.css";
import { getMatch } from "@/features/match-organizer/lib/data";
import { DEFAULT_TIMEZONE, formatDateTime } from "@/features/match-organizer/lib/time";
import type { Player } from "@/features/match-organizer/lib/types";
import { PlayerAvatar } from "@/features/profile/components/PlayerAvatar";
import { RulebookViewer } from "@/features/rulebook/components/RulebookViewer";
import { SpriteSheet } from "@/features/rulebook/components/SpriteSheet";
import { allEntries, knownIds, renderEntry } from "@/features/rulebook/lib/content";
import { entryPath } from "@/features/rulebook/lib/pages";
import "@/features/rulebook/rulepop.css";
import { getAdminView, getCurrentProfile, sameName } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Hős segédlet" };

export default async function HeroGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const viewer = await getCurrentProfile();
  const isAdmin = await getAdminView();
  if (!match.b || !canOpenHeroGuide({ hasOpponent: true, isLoggedIn: !!viewer, isAdmin })) redirect(routes.match(id));

  const tz = viewer?.timezone ?? DEFAULT_TIMEZONE;
  const known = knownIds().heroes;
  const side = (player: Player): GuideSide => ({
    name: player.karnyx_name,
    avatar: <PlayerAvatar name={player.karnyx_name} hero={player.heroes[0]} />,
    isMe: sameName(player.karnyx_name, viewer?.karnyx_name),
    heroes: player.heroes.map((name) => {
      const heroId = heroIdFromName(name);
      return { name, id: heroId, entry: known.has(heroId) ? renderEntry({ kind: "hero", id: heroId }) : null };
    }),
  });

  const back = (
    <Link href={routes.match(id)} className="btn hs-back">
      ‹ Vissza a meccshez
    </Link>
  );

  return (
    <div className="space-y-5">
      {back}
      <div>
        <div className="sec-h">
          <h1>Hős segédlet</h1>
        </div>
        <p className="lead">
          {match.round.number}. forduló · {match.table_no}. asztal
          {match.scheduled_at && ` · ${formatDateTime(match.scheduled_at, tz)}`}
        </p>
      </div>
      <HeroGuide sides={opponentFirst([side(match.a), side(match.b)])} />
      {back}
      {/* Token and rule links open as popups, as in the Szabálytár. */}
      <RulebookViewer paths={allEntries().map(entryPath)} />
      <SpriteSheet />
    </div>
  );
}
