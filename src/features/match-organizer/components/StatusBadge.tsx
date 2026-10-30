import { STATUS_CLASS, STATUS_LABEL } from "@/features/match-organizer/lib/labels";
import type { MatchStatus } from "@/features/match-organizer/lib/types";

export function StatusBadge({ status }: { status: MatchStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}
