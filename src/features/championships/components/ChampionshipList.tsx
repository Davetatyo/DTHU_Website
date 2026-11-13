import Link from "next/link";
import { formatDateTime } from "@/features/match-organizer/lib/time";
import { routes } from "@/lib/routes";
import { championshipAccess } from "@/features/championships/lib/access";
import { FORMAT_LABELS, STATUS_LABELS } from "@/features/championships/lib/rules";
import type { Championship, ChampionshipStatus } from "@/features/championships/lib/types";

const BADGE: Record<ChampionshipStatus, string> = {
  draft: "badge-pending",
  registration: "badge-proposed",
  running: "badge-confirmed",
  finished: "badge-played",
};

/**
 * Every championship the viewer may open: upcoming ones to join, running ones to play or
 * follow, and finished ones they played in (admins see all).
 */
export function ChampionshipList({
  championships,
  mine,
  counts,
  admin,
  timeZone,
}: {
  championships: Championship[];
  mine: Set<string>;
  counts: Map<string, number>;
  admin: boolean;
  timeZone: string;
}) {
  const visible = championships.filter(
    (t) => championshipAccess(t.status, { participant: mine.has(t.id), admin }) !== "hidden",
  );
  const groups: { title: string; status: ChampionshipStatus; empty?: string }[] = [
    { title: "Folyamatban", status: "running" },
    { title: "Jelentkezés nyitva", status: "registration", empty: "Most nincs nyitott jelentkezés. Nézz vissza később!" },
    { title: "Lezárult bajnokságaid", status: "finished" },
  ];

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const list = visible.filter((t) => t.status === g.status);
        if (list.length === 0 && !g.empty) return null;
        return (
          <section key={g.status} className="space-y-2">
            <div className="hh">
              <h2>{g.title}</h2>
            </div>
            {list.length === 0 ? (
              <p className="panel3 muted p-4 text-sm">{g.empty}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((t) => (
                  <Link key={t.id} href={routes.championship(t.slug)} className="panel3 block space-y-2 p-4 hover:border-[var(--gold-dim)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-bold">{t.name}</h3>
                      <span className={`badge ${BADGE[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                    </div>
                    <p className="muted text-sm">
                      {FORMAT_LABELS[t.format]} · {counts.get(t.id) ?? 0} {t.status === "registration" ? "jelentkező" : "játékos"}
                    </p>
                    {t.status === "registration" && (
                      <p className="text-sm">
                        {t.starts_at ? (
                          <>
                            Kezdés: <strong>{formatDateTime(t.starts_at, timeZone)}</strong>
                          </>
                        ) : (
                          "Kezdés: az admin indítja"
                        )}
                      </p>
                    )}
                    {mine.has(t.id) ? (
                      <span className="badge badge-confirmed">{t.status === "registration" ? "Jelentkeztél" : "Játszol benne"}</span>
                    ) : (
                      t.status === "running" && <span className="badge badge-played">Követheted</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Switch between the viewer's own running and upcoming championships. */
export function MyChampionshipChips({ mine, current }: { mine: Championship[]; current: string }) {
  const list = mine.filter((t) => t.status === "running" || t.status === "registration");
  if (list.length < 2 && list.some((t) => t.slug === current)) return null;
  if (list.length === 0) return null;
  return (
    <nav className="ch-chips" aria-label="Bajnokságaim">
      {list.map((t) => (
        <Link key={t.id} href={routes.championship(t.slug)} aria-current={t.slug === current ? "page" : undefined}>
          {t.status === "running" && <span className="dot" aria-hidden />}
          {t.name}
        </Link>
      ))}
    </nav>
  );
}
