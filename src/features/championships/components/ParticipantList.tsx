import { PlayerLink } from "@/features/player-stats/components/PlayerLink";
import { PlayerAvatar } from "@/features/profile/components/PlayerAvatar";

export type Participant = { name: string; heroes?: string[]; locked?: boolean };

/**
 * Tournament participants as profile pictures (with their badge, if they wear one). Heroes are
 * only passed once they are public, i.e. after the start.
 */
export function ParticipantList({ people }: { people: Participant[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {people.map((p) => (
        <li key={p.name} className="flex min-w-0 items-center gap-3 rounded-lg p-2" style={{ background: "var(--surface-2)" }}>
          <PlayerLink name={p.name} decorative>
            <PlayerAvatar name={p.name} hero={p.heroes?.[0]} size="md" />
          </PlayerLink>
          <div className="min-w-0">
            <div className="truncate font-semibold">
              <PlayerLink name={p.name} />
              {p.locked && (
                <span className="ml-1" title="Véglegesítette a jelentkezését">
                  🔒
                </span>
              )}
            </div>
            {p.heroes && p.heroes.length > 0 && <div className="muted truncate text-xs">{p.heroes.join(", ")}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
