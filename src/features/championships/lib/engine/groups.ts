import type { Participant, PlayerId, Standing } from "./types";
import { createRng, shuffle } from "./seed";

/**
 * Deal seeded players into groups in snake order (1,2,3,3,2,1,...) so groups
 * are balanced. Unseeded players are shuffled first.
 */
export function generateGroups(
  players: Participant[],
  opts: { groups: number; seed: string },
): Record<string, Participant[]> {
  const active = players.filter((p) => !p.dropped);
  if (active.length < 2 || opts.groups < 1) return {};

  const withSeeds = active.filter((p) => p.seed != null);
  const withoutSeeds = active.filter((p) => p.seed == null);
  withSeeds.sort((a, b) => a.seed! - b.seed!);
  const shuffled = shuffle(withoutSeeds, createRng(opts.seed));
  const ordered = [...withSeeds, ...shuffled];

  const groupCount = Math.min(opts.groups, active.length);
  const labels = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
  const groups: Record<string, Participant[]> = {};
  for (const l of labels) groups[l] = [];

  let forward = true;
  let gi = 0;
  for (const p of ordered) {
    groups[labels[gi]].push(p);
    if (forward) {
      gi++;
      if (gi >= groupCount) {
        gi = groupCount - 1;
        forward = false;
      }
    } else {
      gi--;
      if (gi < 0) {
        gi = 0;
        forward = true;
      }
    }
  }

  return groups;
}

/**
 * Take the top K players from each group and order them for a playoff bracket.
 * Group winners meet runners-up from other groups. Two players from the same
 * group do not meet in the first knockout round when avoidable.
 */
export function seedPlayoffs(
  groupStandings: Record<string, Standing[]>,
  advancePerGroup: number,
): Participant[] {
  const groups = Object.keys(groupStandings).sort();
  const qualified: Array<{ id: PlayerId; group: string; groupRank: number }> = [];

  for (const g of groups) {
    const top = groupStandings[g].slice(0, advancePerGroup);
    for (let i = 0; i < top.length; i++) {
      qualified.push({ id: top[i].id, group: g, groupRank: i + 1 });
    }
  }

  // Sort: group rank first (all winners, then all runners-up, etc.)
  // Within the same group rank, interleave groups so same-group players are far apart
  qualified.sort((a, b) => {
    if (a.groupRank !== b.groupRank) return a.groupRank - b.groupRank;
    return a.group.localeCompare(b.group);
  });

  // Assign seeds: winner of group A = 1, winner of group B = 2, etc.
  // Runner-up of group B = next (cross with group A's winner), etc.
  const result: Participant[] = [];

  // Interleave so group A winner faces group B runner-up (not group A runner-up) in round 1
  const byRank: Array<Array<{ id: PlayerId; group: string }>> = [];
  for (let r = 0; r < advancePerGroup; r++) {
    byRank.push(qualified.filter((q) => q.groupRank === r + 1));
  }

  let seed = 1;
  // Winners in group order
  for (const q of byRank[0] ?? []) {
    result.push({ id: q.id, seed: seed++ });
  }
  // Runners-up in reversed group order (so A-winner meets last-group runner-up)
  for (let r = 1; r < byRank.length; r++) {
    const row = byRank[r];
    const reversed = row.slice().reverse();
    for (const q of reversed) {
      result.push({ id: q.id, seed: seed++ });
    }
  }

  return result;
}
