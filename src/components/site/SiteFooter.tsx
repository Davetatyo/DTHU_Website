import Link from "next/link";
import { routes } from "@/lib/routes";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        Kérdésed van? Nézd meg a{" "}
        <Link href={routes.organizerFaq} className="link">
          gyakran ismételt kérdéseket
        </Link>
        , vagy írj a Discordon.
      </div>
      <div>A Dice Throne a Roxley Games védjegye. Ez egy rajongói, nem hivatalos közösségi oldal.</div>
    </footer>
  );
}
