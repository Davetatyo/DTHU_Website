import type { Metadata } from "next";
import Link from "next/link";
import { FAQ } from "@/features/faq/data/faq";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "GYIK" };

export default function FaqPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>GYIK</h1>
        </div>
        <p className="lead">
          Gyakran ismételt kérdések a versenyekről, az egyeztetésről és a jegyekről. A Meccsszervező részletes kérdései:{" "}
          <Link href={routes.organizerFaq} className="link">
            Meccsszervező GYIK
          </Link>
          .
        </p>
      </div>
      <div className="faq max-w-3xl">
        {FAQ.map(([q, a], i) => (
          <details key={q} open={i === 0}>
            <summary>{q}</summary>
            <div className="text-sm leading-relaxed">{a}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
