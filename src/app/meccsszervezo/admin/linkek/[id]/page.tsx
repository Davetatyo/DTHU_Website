import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { CoverEditor } from "@/components/content/CoverEditor";
import { deleteLink, removeLinkImage, saveLink, uploadLinkImage } from "@/features/links/actions/links";
import { LinkFormFields } from "@/features/links/components/LinkFormFields";
import { getLinkById, linkImageUrl } from "@/features/links/lib/links-data";

export const metadata: Metadata = { title: "Link szerkesztése" };

// Admin-only: edit a link, its picture, hide or delete it.
export default async function EditLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uzenet?: string; hiba?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { uzenet, hiba } = await searchParams;
  const link = await getLinkById(id);
  if (!link) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={routes.adminLinks} className="muted text-sm">
        ← Linkek
      </Link>
      <div className="sec-h">
        <h1>Link szerkesztése</h1>
      </div>
      {uzenet && <p className="alert-ok">{uzenet}</p>}
      {hiba && <p className="alert-error">{hiba}</p>}

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">
          Kép (nem kötelező)
          <InfoTip text="A csempe háttere a Linkek oldalon. Feltöltés előtt a csempe alakjára vághatod; azonnal mentődik." />
        </h2>
        <CoverEditor
          ownerField="link_id"
          ownerId={link.id}
          currentUrl={linkImageUrl(link.image_path)}
          emptyText="Nincs kép: a csempe arany színátmenetet és link ikont mutat."
          upload={uploadLinkImage}
          remove={removeLinkImage}
        />
      </section>

      <form action={saveLink} className="card space-y-4">
        <input type="hidden" name="link_id" value={link.id} />
        <LinkFormFields values={link} showVisible />
        <SubmitButton className="btn w-full">Mentés</SubmitButton>
      </form>

      <form action={deleteLink} className="card danger-zone space-y-2">
        <input type="hidden" name="link_id" value={link.id} />
        <h2 className="text-lg font-bold">Link törlése</h2>
        <p className="muted text-sm">Véglegesen törlődik a képével együtt. Ha csak elrejtenéd, kapcsold ki a „Látható” jelölést.</p>
        <SubmitButton className="btn btn-danger" confirm={`Biztosan törlöd: ${link.title}?`}>
          Törlés
        </SubmitButton>
      </form>
    </div>
  );
}
