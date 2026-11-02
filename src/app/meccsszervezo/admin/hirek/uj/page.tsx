import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { SubmitButton } from "@/components/SubmitButton";
import { createNews } from "@/features/landing-page/actions/news";
import { NewsFormFields } from "@/features/landing-page/components/NewsFormFields";
import { getAuthorOptions } from "@/features/landing-page/lib/news-data";

export const metadata: Metadata = { title: "Új hír" };

// Admin-only: the first step of a new article. It's saved as a draft; pictures, content and
// publishing follow on the edit page.
export default async function NewNewsPage({ searchParams }: { searchParams: Promise<{ hiba?: string }> }) {
  const me = await requireAdmin();
  const { hiba } = await searchParams;
  const authors = await getAuthorOptions();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={routes.adminNews} className="muted text-sm">
        ← Hírek
      </Link>
      <div className="sec-h">
        <h1>Új hír</h1>
      </div>
      {hiba && <p className="alert-error">{hiba}</p>}
      <form action={createNews} className="card space-y-4">
        <NewsFormFields values={{ title: "", category: "tournament", lead: "", author_id: me.id, pinned: false }} authors={authors} />
        <p className="muted text-sm">Piszkozatként mentődik. Utána hozzáadhatod a képet és a tartalmat, és közzéteheted.</p>
        <SubmitButton className="btn w-full">Piszkozat mentése</SubmitButton>
      </form>
    </div>
  );
}
