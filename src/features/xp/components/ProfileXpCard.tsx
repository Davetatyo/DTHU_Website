import { BadgedAvatar } from "@/features/profile/components/BadgedAvatar";
import { getTestBadge } from "@/features/profile/lib/test-badge";
import { canSeeXp, getXpSummary } from "../lib/data";
import { nextRewardLevel } from "../lib/rules";
import { XpBar } from "./XpBar";

/** Profilom, on top: the level card (option A, owner 2026-11-08). Only for those who see XP. */
export async function ProfileXpCard({ profileId, avatarUrl }: { profileId: string; avatarUrl: string | null }) {
  if (!(await canSeeXp())) return null;
  const [{ info }, badge] = await Promise.all([getXpSummary(profileId), getTestBadge()]);
  const next = nextRewardLevel(info.level);
  return (
    <section className="card xp-card">
      <div className="xp-card-top">
        <span className="xp-card-av">
          {badge ? (
            <BadgedAvatar badge={badge} picture={84} avatarUrl={avatarUrl} />
          ) : (
            <span className="xp-pic" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined} />
          )}
          <span className="xp-medal">{info.level}</span>
        </span>
        <div className="xp-card-main">
          <div className="xp-card-title">
            <b>{info.level}. szint</b>
            <span>összesen {info.total} XP</span>
          </div>
          <XpBar info={info} big />
          <div className="xp-card-sub">
            {info.need} XP a {info.level + 1}. szintig
          </div>
        </div>
      </div>
      {next && (
        <div className="xp-card-next">
          <span className="xp-curtain" title="Meglepetés: a szint elérésekor kiderül">
            ?
          </span>
          <div>
            <b>Következő jutalom</b>
            <small>A {next}. szinten kiderül, mi van a függöny mögött.</small>
          </div>
        </div>
      )}
      <p className="xp-card-note">A szinted és az XP-d csak te látod.</p>
    </section>
  );
}
