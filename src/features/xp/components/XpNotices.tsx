import { getCurrentProfile } from "@/lib/auth";
import { avatarPublicUrl } from "@/lib/avatar-url";
import { canSeeXp, getCurve, getUnseenXp, getXpTotal } from "../lib/data";
import { levelInfo } from "../lib/levels";
import { rewardForLevel } from "../lib/rules";
import { XpNotifier } from "./XpNotifier";

/** In the layouts: new XP since the player last looked, shown once. */
export async function XpNotices() {
  if (!(await canSeeXp())) return null;
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const unseen = await getUnseenXp(profile.id);
  if (!unseen) return null;
  const { events, before, after } = unseen;
  const gained = events.reduce((sum, e) => sum + e.amount, 0);
  if (gained === 0) return null;
  const reached = Array.from({ length: after.level - before.level }, (_, i) => after.level - i);
  const reward = reached.map(rewardForLevel).find(Boolean) ?? null;
  const text = events.length === 1 ? events[0].label : `${events[events.length - 1].label} és még ${events.length - 1}`;
  return <XpNotifier notice={{ gained, text, before, after, rewardId: reward?.id ?? null }} avatarUrl={avatarPublicUrl(profile.avatar_path)} />;
}

/** The header's thin XP bar under the name, or undefined when XP isn't shown. */
export async function headerXp(): Promise<{ pct: number; title: string } | undefined> {
  if (!(await canSeeXp())) return undefined;
  const profile = await getCurrentProfile();
  if (!profile) return undefined;
  const [total, curve] = await Promise.all([getXpTotal(profile.id), getCurve()]);
  const info = levelInfo(total, curve);
  return { pct: info.pct, title: `${info.level}. szint · ${info.into} / ${info.to - info.from} XP` };
}
