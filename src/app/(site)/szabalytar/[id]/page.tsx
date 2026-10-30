import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { RT_SPECIAL, RT_TABS, RULES } from "@/features/rulebook/data/rules";
import { routes } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site";
import "@/features/rulebook/rulebook.css";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: RULES.find((r) => r.id === id)?.t ?? "Szabálytár" };
}

/** One rule on its own page (shareable link), with previous/next in the same category. */
export default async function RulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (RT_SPECIAL[id]) redirect(routes.rulebookTab(RT_SPECIAL[id]));
  const rule = RULES.find((r) => r.id === id);
  if (!rule) notFound();

  const siblings = RULES.filter((r) => r.cat === rule.cat);
  const j = siblings.indexOf(rule);
  const prev = siblings[j - 1];
  const next = siblings[j + 1];
  const tabName = RT_TABS.find(([k]) => k === rule.cat)?.[1];
  const url = `${await getSiteUrl()}${routes.rule(rule.id)}`;

  return (
    <div className="space-y-4">
      <nav className="rt-crumb px">
        <Link href={routes.rulebook}>Szabálytár</Link> › <Link href={routes.rulebookTab(rule.cat)}>{tabName}</Link> › {rule.t}
      </nav>
      <article className="rt-art">
        <div className="rt-ah">
          <h1>{rule.t}</h1>
          <span className="muted">{rule.en}</span>
          <span className="ml-auto">
            <CopyButton text={url} label="Link másolása" />
          </span>
        </div>
        {/* Our own trusted content from features/rulebook/data/rules.ts */}
        <div className="rt-body" dangerouslySetInnerHTML={{ __html: rule.b }} />
      </article>
      <div className="rt-pn">
        {prev ? (
          <Link className="btn btn-secondary" href={routes.rule(prev.id)}>
            ‹ {prev.t}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="btn btn-secondary" href={routes.rule(next.id)}>
            {next.t} ›
          </Link>
        )}
      </div>
    </div>
  );
}
