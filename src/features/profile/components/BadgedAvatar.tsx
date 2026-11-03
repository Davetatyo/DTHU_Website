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
