import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EntryView } from "@/features/rulebook/components/EntryView";
import { entryDescription, knownIds, renderEntry } from "@/features/rulebook/lib/content";
import { LEGACY_SLUGS, refForPath, RULEBOOK_PATH } from "@/features/rulebook/lib/pages";

type Props = { params: Promise<{ path: string[] }> };

async function find(params: Props["params"]) {
  const { path } = await params;
  const segments = path.map(decodeURIComponent);
  const ref = refForPath(segments, knownIds());
  return { segments, entry: ref ? renderEntry(ref) : null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { entry } = await find(params);
  if (!entry) return { title: "Szabálytár" };
  return { title: `${entry.title} – Szabálytár`, description: entryDescription(entry) };
}

/** A rule, hero or token on its own page (shared links land here; clicks inside open popups). */
export default async function RuleEntryPage({ params }: Props) {
  const { segments, entry } = await find(params);
  if (!entry) {
    const legacy = segments.length === 1 ? LEGACY_SLUGS[segments[0]] : undefined;
    if (legacy) redirect(`${RULEBOOK_PATH}/${legacy}`);
    notFound();
  }
  return (
    <div className="space-y-3">
      <nav className="rp-crumb">
        <Link href={RULEBOOK_PATH}>‹ Szabálytár</Link>
      </nav>
      <div className={`rp-page rp-${entry.width}`}>
        <EntryView entry={entry} />
      </div>
    </div>
  );
}
