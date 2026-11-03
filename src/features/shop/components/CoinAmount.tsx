import { DthuCoin } from "@/components/DthuCoin";
import { formatCoins } from "../lib/catalog";

/** An amount of DTHU coins: the coin icon and the number ("🪙 3500"). */
export function CoinAmount({ value, size = 20, className = "" }: { value: number; size?: number; className?: string }) {
  return (
    <span className={`coinamt ${className}`}>
      <DthuCoin size={size} />
      <span>{formatCoins(value)}</span>
      <span className="sr-only"> DTHU coin</span>
    </span>
  );
}
