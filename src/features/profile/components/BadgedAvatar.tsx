import { UserIcon } from "@/components/icons";
import { badgeBoxSize, type Badge } from "../lib/badges";
import "../badges.css";

/**
 * A profile picture with a badge ring around it. `picture` is the picture's diameter (px); the
 * badge image is sized from it so the picture exactly fills the badge's hole. `small` uses
 * the simplified header drawing.
 */
export function BadgedAvatar({
  badge,
  picture,
  avatarUrl,
  small,
  className,
}: {
  badge: Badge;
  picture: number;
  avatarUrl: string | null;
  small?: boolean;
  className?: string;
}) {
  const size = badgeBoxSize(picture, small ? badge.holeSmall : badge.hole);
  const inset = (size - picture - 1) / 2; // 1 px larger than the hole, so no seam shows
  return (
    <span className={`badged${className ? ` ${className}` : ""}`} style={{ width: size, height: size }} aria-hidden>
      <span
        className="badged-pic"
        style={{
          inset,
          backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
        }}
      >
        {!avatarUrl && <UserIcon />}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size decorative ring, already optimised */}
      <img className="badged-ring" src={small ? badge.srcSmall : badge.src} alt="" width={size} height={size} draggable={false} />
    </span>
  );
}

/**
 * Puts a badge around an existing round avatar (e.g. HeroAvatar) without changing the space it
 * takes: the badge is a bit larger than the avatar's footprint and overflows evenly, and the
 * picture shrinks to fit the badge's hole. `footprint` = the avatar's normal size (px).
 */
export function BadgeOverlay({ badge, footprint, children }: { badge: Badge; footprint: number; children: React.ReactNode }) {
  const ring = Math.round(footprint * 1.3);
  const small = ring < 70;
  const picture = Math.round(ring * 2 * (small ? badge.holeSmall : badge.hole));
  return (
    <span className="badge-wrap" style={{ width: footprint, height: footprint, ["--pic" as string]: `${picture + 1}px` }}>
      {children}
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size decorative ring */}
      <img className="badge-wrap-ring" src={small ? badge.srcSmall : badge.src} alt="" width={ring} height={ring} draggable={false} />
    </span>
  );
}
