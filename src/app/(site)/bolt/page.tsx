import type { Metadata } from "next";
import { loadRanking, rowOf } from "@/features/rankings/lib/load";
import { ShopGrid } from "@/features/shop/components/ShopGrid";
import { getCurrentProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Bolt" };

export default async function ShopPage() {
  const viewer = await getCurrentProfile();
  const balance = viewer ? (rowOf(await loadRanking(), viewer.karnyx_name)?.tix ?? 0) : null;
  return (
    <div className="space-y-4">
      <div>
        <div className="sec-h">
          <h1>Bolt</h1>
        </div>
        <p className="lead">A bolt még nem nyílt meg. Jelöld meg, mit vennél, így látjuk, mire van igény.</p>
      </div>
      <ShopGrid balance={balance} />
    </div>
  );
}
