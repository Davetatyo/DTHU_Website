import Link from "next/link";
import { routes } from "@/lib/routes";

// Site home ("Hírek"). Hidden until the full site opens: middleware redirects here to the
// Meccsszervező in phase 1. Built on branch feature/landing-page (src/features/landing-page).
export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">DTHU – Dice Throne Hungary</h1>
      <p className="muted mt-2">
        A teljes oldal készül. Addig a <Link href={routes.organizer} className="link">Meccsszervező</Link> érhető el.
      </p>
    </div>
  );
}
