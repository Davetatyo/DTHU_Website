import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { SubmitButton } from "@/components/SubmitButton";
import { createLink } from "@/features/links/actions/links";
import { LinkFormFields } from "@/features/links/components/LinkFormFields";

export const metadata: Metadata = { title: "Új link" };

// Admin-only: a new link goes to the end of the list and shows at once; a picture can be added next.
export default async function NewLinkPage({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  await requireAdmin();
  const { hiba } = await searchParams;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={routes.adminLinks} className="muted text-sm">
        ← Linkek
      </Link>
      <div className="sec-h">
        <h1>Új link</h1>
      </div>
      {hiba && <p className="alert-error">{hiba}</p>}
      <form action={createLink} className="card space-y-4">
        <LinkFormFields values={{}} showVisible={false} />
        <p className="muted text-sm">Mentés után a lista végére kerül, és rögtön látszik. Képet a következő oldalon adhatsz hozzá.</p>
        <SubmitButton className="btn w-full">Link mentése</SubmitButton>
      </form>
    </div>
  );
}
