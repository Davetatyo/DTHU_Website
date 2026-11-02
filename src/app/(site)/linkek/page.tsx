import type { Metadata } from "next";
import { LinkTile } from "@/features/links/components/LinkTile";
import { getVisibleLinks } from "@/features/links/lib/links-data";

export const metadata: Metadata = { title: "Linkek" };

export default async function LinksPage() {
  const links = await getVisibleLinks();
  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Linkek</h1>
        </div>
        <p className="lead">Minden, ami a magyar Dice Throne közösséghez kell.</p>
      </div>
      {links.length ? (
        <div className="cards sm">
          {links.map((l) => (
            <LinkTile key={l.id} link={l} />
          ))}
        </div>
      ) : (
        <p className="card muted">Még nincs link.</p>
      )}
    </div>
  );
}
