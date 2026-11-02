import { allEntries, knownIds, renderEntry } from "@/features/rulebook/lib/content";
import { entryPath, refForPath } from "@/features/rulebook/lib/pages";

// One Szabálytár entry as JSON for the popups. Built once at deploy time and served as a static
// file (no server work, no middleware), like RulePop's partials.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return allEntries().map((ref) => ({ path: entryPath(ref).split("/") }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const ref = refForPath(path.map(decodeURIComponent), knownIds());
  if (!ref) return Response.json({ error: "Nincs ilyen szabály." }, { status: 404 });
  return Response.json(renderEntry(ref));
}
