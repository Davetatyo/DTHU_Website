import { STATUS_CLASS, STATUS_LABEL } from "@/lib/labels";
import type { MatchStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: MatchStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}
