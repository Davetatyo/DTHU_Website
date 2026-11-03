import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SpinWheel } from "@/features/games/components/SpinWheel";
import { StreakInfo } from "@/features/games/components/StreakInfo";
import { DailyNotReady, getDailyState } from "@/features/games/lib/daily-data";
import { loadEconomy } from "@/features/shop/lib/economy-store";
import { getCurrentProfile } from "@/lib/auth";
import { routes } from "@/lib/routes";
import "@/features/games/daily.css";

export const metadata: Metadata = { title: "Szerencsekerék" };

export default async function SpinPage({
  searchParams,
}: {
  searchParams: Promise<{ eredmeny?: string; bonusz?: string }>;
}) {
  const { eredmeny, bonusz } = await searchParams;
  const viewer = await getCurrentProfile();
  const economy = await loadEconomy();
  let state = null;
  let ready = true;
  try {
    state = await getDailyState(viewer?.id ?? null);
  } catch (err) {
    if (!(err instanceof DailyNotReady)) throw err;
    ready = false;
  }
  // Locked after spinning: right after the spin the page reloads once with eredmeny=1 (so the
  // header balance and the streak update) and shows the result; any later visit goes back to
  // the Játékok page, where the card is grey with the countdown.
  if (viewer && state?.spin && !eredmeny) redirect(routes.games);
  const landed = state?.spin
    ? { index: Math.max(0, economy.spinTable.findIndex((p) => p.label === state.spin!.result_label)), coins: state.spin.coins, nextReset: state.nextReset, streakBonus: Math.max(0, Number(bonusz) || 0) }
    : null;

  return (
    <div className="daily-panel space-y-5">
      <div>
        <div className="sec-h">
          <h1>Szerencsekerék</h1>
        </div>
        <p className="lead">
          Naponta egy ingyenes pörgetés: nyomd meg a kerék közepét! Éjfélkor (budapesti idő) újra pörgethetsz. Coint nem lehet feltenni, csak nyerni.
        </p>
      </div>
      {!ready && (
        <p className="alert-error">
          A napi játékok adatbázisa még nincs beállítva (supabase/migrations/0010_daily_spin_and_question.sql).
        </p>
      )}

      {ready && (
        <SpinWheel
          slices={economy.spinTable.map((p) => ({ label: p.label, coins: p.coins }))}
          canSpin={!!viewer && !state?.spin}
          landed={landed}
        />
      )}
      {!viewer && (
        <p className="text-center">
          <Link href={routes.login} className="btn btn-discord">
            Belépés a pörgetéshez
          </Link>
        </p>
      )}
      {viewer && state && <StreakInfo game="spin" streak={state.spinStreak} length={state.streakLength} bonus={state.streakBonus} />}

    </div>
  );
}
