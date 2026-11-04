import { canSeeLiveBanner, getLiveCards } from "../lib/data";
import { LiveBannerCards } from "./LiveBannerCards";

/** The "Élő adás" banner at the top of the page layouts. Nothing for visitors who can't see it. */
export async function LiveBanner() {
  if (!(await canSeeLiveBanner())) return null;
  return <LiveBannerCards initial={await getLiveCards()} />;
}
