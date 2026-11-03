import { InfoTip } from "@/components/InfoTip";

/** "Sorozat ●●●○○○○ 3/7 nap" for one daily game (the spin and the quiz each have their own). */
export function StreakInfo({
  game,
  streak,
  length,
  bonus,
}: {
  game: "spin" | "quiz";
  streak: number;
  length: number;
  bonus: number;
}) {
  const dots = Math.min(length, 14);
  const what = game === "spin" ? "pörgetsz" : "válaszolsz a Napi kvízen";
  return (
    <span className="streak">
      <b>Sorozat</b>
      <span className="dots" aria-hidden>
        {Array.from({ length: dots }, (_, i) => (
          <i key={i} className={i < streak ? "on" : ""} />
        ))}
      </span>
      <span>
        {streak}/{length} nap
      </span>
      <InfoTip
        text={`Ha ${length} napig minden nap ${what} (budapesti idő szerint 00:00-tól), a ${length}. napon +${bonus} bónusz coint kapsz a napi nyereményed mellé, akkor is, ha aznap nem nyertél. Utána új kör indul 1-től. Ha kihagysz egy napot, elölről kezded.`}
      />
    </span>
  );
}
