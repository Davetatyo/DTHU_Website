import Link from "next/link";
import { routes } from "@/lib/routes";
import "../hero-guide.css";

/** The orange button on the match page, next to Lejátszottuk and the same size. */
export function HeroGuideLink({ matchId }: { matchId: string }) {
  return (
    <Link href={routes.heroGuide(matchId)} className="btn btn-played btn-hero-guide">
      Hős segédlet
    </Link>
  );
}
