import Link from "next/link";
import { routes } from "@/lib/routes";

// Site home ("Hírek"). Hidden until the full site opens. Built on branch feature/landing-page;
// the design is the Hírek view in reference/artifact.
export default function HomePage() {
  return (
    <section className="hero3">
      <div className="img" />
      <div className="in">
        <span className="livechip">Hamarosan</span>
        <h1>A DTHU új oldala készül</h1>
        <div className="meta">Hírek, ranglista, versenynaptár, jegyek és bolt – egy helyen.</div>
        <div>
          <Link href={routes.organizer} className="btn">
            Irány a Meccsszervező
          </Link>
        </div>
      </div>
    </section>
  );
}
