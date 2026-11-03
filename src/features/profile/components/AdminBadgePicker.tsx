import { InfoTip } from "@/components/InfoTip";
import { SubmitButton } from "@/components/SubmitButton";
import { setTestBadge } from "../actions/badge";
import { BADGES, tierPlace, type Badge } from "../lib/badges";
import { BadgedAvatar } from "./BadgedAvatar";

/** One badge in the try-on grid: preview with the admin's own picture and a wear button. */
function Item({ badge, current, avatarUrl }: { badge: Badge; current: Badge | null; avatarUrl: string | null }) {
  const on = current?.id === badge.id;
  return (
    <div className={`badge-test-item${on ? " on" : ""}`}>
      <BadgedAvatar badge={badge} picture={52} avatarUrl={avatarUrl} />
      <b>{badge.name}</b>
      <small>{badge.group === "level" ? `${badge.level}. szint` : tierPlace(badge.tier!)}</small>
      <form action={setTestBadge} className="mt-1">
        <input type="hidden" name="badge" value={on ? "" : badge.id} />
        <SubmitButton className={`btn btn-sm${on ? "" : " btn-secondary"}`}>{on ? "Leveszem" : "Felveszem"}</SubmitButton>
      </form>
    </div>
  );
}

/**
 * Admin-only badge try-on on Profilom (testing, before the real Gyűjtemény). The chosen badge
 * shows on the admin's own header chip and here; nobody else sees it (see lib/test-badge).
 */
export function AdminBadgePicker({ current, avatarUrl }: { current: Badge | null; avatarUrl: string | null }) {
  const levels = BADGES.filter((b) => b.group === "level");
  const sets = [...new Set(BADGES.filter((b) => b.group === "podium").map((b) => b.set!))];

  return (
    <div className="card mb-5">
      <p className="label">
        Jelvények · admin teszt
        <InfoTip text="Csak adminoknak. Bármelyik jelvényt felveheted, hogy kipróbáld, hogyan néz ki a fejlécben és itt. Csak te látod, ebben a böngészőben; a játékosok és a többi admin nem. A valódi gyűjtemény később jön." />
      </p>
      <div className="badge-test-head mt-2">
        {current ? (
          <BadgedAvatar badge={current} picture={96} avatarUrl={avatarUrl} />
        ) : (
          <span className="muted text-sm">Most nincs rajtad jelvény.</span>
        )}
        {current && (
          <div>
            <b>{current.name}</b>
            <p className="muted text-sm">Ezt viseled most (csak te látod).</p>
            <form action={setTestBadge} className="mt-2">
              <input type="hidden" name="badge" value="" />
              <SubmitButton className="btn btn-sm btn-secondary">Leveszem</SubmitButton>
            </form>
          </div>
        )}
      </div>

      <p className="label mt-5">Szint jelvények</p>
      <div className="badge-test-grid">
        {levels.map((b) => (
          <Item key={b.id} badge={b} current={current} avatarUrl={avatarUrl} />
        ))}
      </div>

      {sets.map((set) => (
        <div key={set}>
          <p className="label mt-5">Dobogó · {set}</p>
          <div className="badge-test-grid">
            {BADGES.filter((b) => b.set === set).map((b) => (
              <Item key={b.id} badge={b} current={current} avatarUrl={avatarUrl} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
