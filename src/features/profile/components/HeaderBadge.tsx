import { getCurrentProfile } from "@/lib/auth";
import { avatarPublicUrl } from "@/lib/avatar-url";
import { getTestBadge } from "../lib/test-badge";
import { BadgedAvatar } from "./BadgedAvatar";

/**
 * The header chip's picture with the badge the signed-in admin is trying on, or undefined (the
 * header then shows its normal picture). The layouts pass it to SiteHeader, because
 * components/ may not import features.
 */
export async function headerBadge(): Promise<React.ReactNode | undefined> {
  const badge = await getTestBadge();
  if (!badge) return undefined;
  const profile = await getCurrentProfile();
  return <BadgedAvatar badge={badge} picture={18} small avatarUrl={avatarPublicUrl(profile?.avatar_path)} />;
}
