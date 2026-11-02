import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { SubmitButton } from "@/components/SubmitButton";
import { moveLink } from "@/features/links/actions/links";
import { getAllLinks, linkImageUrl } from "@/features/links/lib/links-data";

export const metadata: Metadata = { title: "Linkek kezelése" };

// Admin-only: the Linkek page's links in page order; ↑ / ↓ move them.
export default async function AdminLinksPage({ searchParams }: { searchParams: Promise<{ uzenet?: string; hiba?: string }> }) {
  await requireAdmin();
  const { uzenet, hiba } = await searchParams;
  const links = await getAllLinks();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={routes.admin} className="muted text-sm">
        ← Admin felület
      </Link>
      <div className="sec-h">
        <h1>Linkek</h1>
      </div>
      <p className="muted">A Linkek oldal csempéi ebben a sorrendben jelennek meg. A nyilakkal rendezheted őket.</p>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      <Link href={routes.adminLinkNew} className="btn">
        + Új link
      </Link>

      {links.length === 0 ? (
        <p className="card muted">Még nincs link. (Ha a négy régi link sem látszik, futtasd le a 0006-os adatbázis-frissítést.)</p>
      ) : (
        <ul className="card divide-y" style={{ padding: 0 }}>
          {links.map((l, i) => {
            const image = linkImageUrl(l.image_path);
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 p-3" style={{ borderColor: "var(--line)" }}>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a picture from Supabase Storage
                  <img src={image} alt="" style={{ width: 64, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 4, flex: "none" }} />
                ) : (
                  <span aria-hidden style={{ width: 64, aspectRatio: "16 / 9", borderRadius: 4, flex: "none", background: "radial-gradient(circle at 70% 30%, var(--gold-dim), var(--bg2))" }} />
                )}
                <span className="min-w-0 flex-1">
                  <b>{l.title}</b>
                  {!l.visible && <span className="badge badge-played ml-1">rejtett</span>}
                  <span className="muted block truncate text-sm">{l.url}</span>
                </span>
                <span className="ml-auto flex gap-1">
                  <form action={moveLink}>
                    <input type="hidden" name="link_id" value={l.id} />
                    <input type="hidden" name="dir" value="up" />
                    <SubmitButton className="btn btn-secondary btn-sm" disabled={i === 0}>
                      ↑
                    </SubmitButton>
                  </form>
                  <form action={moveLink}>
                    <input type="hidden" name="link_id" value={l.id} />
                    <input type="hidden" name="dir" value="down" />
                    <SubmitButton className="btn btn-secondary btn-sm" disabled={i === links.length - 1}>
                      ↓
                    </SubmitButton>
                  </form>
                  <Link href={routes.adminLink(l.id)} className="btn btn-secondary btn-sm">
                    Szerkesztés
                  </Link>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
