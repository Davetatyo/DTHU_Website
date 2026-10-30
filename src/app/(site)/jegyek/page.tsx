import type { Metadata } from "next";
import Link from "next/link";
import { Art } from "@/components/Art";
import type { IconId } from "@/components/Icon";
import { loadRanking, rowOf } from "@/features/rankings/lib/load";
import { EARN } from "@/features/tickets/data/earn";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/tickets/tickets.css";

export const metadata: Metadata = { title: "Jegyek" };

const ICONS: IconId[] = ["swords", "trophy", "scroll", "die", "gem", "link"];
const COLORS = ["#a8322b", "#d4ab52", "#4f8fe0", "#5eae4a", "#8b55d6", "#3fb39a"];

// Balance is SAMPLE data (from the sample ranking) until the ticket ledger exists.
export default async function TicketsPage() {
  const viewer = await getCurrentProfile();
  const row = rowOf(await loadRanking(), viewer?.karnyx_name);

  return (
    <div className="space-y-5">
      <div className="tile wallettile">
        <Art spec={{ c1: "#e0b24a", c2: "#7a2fb0", g: "ticket", prompt: "magic wallet overflowing with glowing golden tickets, fantasy UI hero image" }} />
        <div className="in">
          {viewer ? (
            <>
              <span className="k">{viewer.karnyx_name ?? viewer.display_name} egyenlege</span>
              <div className="big">{row?.tix ?? 0}</div>
              <span className="sub">jegy</span>
              <Link href={routes.shop} className="btn self-start">
                Irány a bolt
              </Link>
            </>
          ) : (
            <>
              <span className="k">Jegyek</span>
              <h3 className="text-3xl">Játssz, gyűjts, válts be</h3>
              <Link href={routes.login} className="btn btn-discord self-start">
                Belépés Discorddal
              </Link>
            </>
          )}
        </div>
      </div>
      <div>
        <div className="rowh">
          <h2>Így szerzel jegyet</h2>
        </div>
        <div className="cards sm">
          {EARN.map(([t, n], i) => (
            <div key={t} className="tile earn">
              <Art spec={{ c1: COLORS[i], c2: "#15131c", g: ICONS[i], prompt: t }} />
              <div className="in">
                <span className="plus">{n}</span>
                <span className="sub" style={{ color: "#f4ecda" }}>
                  {t}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
