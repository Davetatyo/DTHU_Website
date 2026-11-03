"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DthuCoin } from "@/components/DthuCoin";
import { routes } from "@/lib/routes";
import { spinToday, type SpinResult } from "../actions/daily";
import { ResetCountdown } from "./ResetCountdown";

// Slice colours: [light, dark] for a radial shine on each slice.
const COLORS: [string, string][] = [
  ["#4a4458", "#1f1b29"],
  ["#f3cf6b", "#b47f1d"],
  ["#a565e8", "#5a1f93"],
  ["#e2574c", "#8e1f18"],
  ["#5fd3b6", "#1f7f69"],
  ["#73aef5", "#2a5fb0"],
  ["#f0a35a", "#a5531b"],
  ["#88d06e", "#3f7f2b"],
];
const SPIN_MS = 5200;
const C = 150; // centre of the 300×300 drawing
const R = 128; // slice radius

// Rounded to 2 decimals: the server and the browser can differ in the last digits of cos/sin,
// which React reports as a hydration mismatch.
const round = (x: number) => Math.round(x * 100) / 100;
function point(deg: number, r: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [round(C + r * Math.cos(a)), round(C + r * Math.sin(a))];
}

/**
 * The prize wheel. Slices are equal in size; the server draws the prize (with the chances in the
 * admin settings) and the wheel only turns to the slice it names. The spin button sits in the
 * middle and doesn't turn with the wheel.
 */
export function SpinWheel({
  slices,
  canSpin,
  landed,
}: {
  slices: { label: string; coins: number }[];
  canSpin: boolean;
  /** Today's spin, when the page shows the result after spinning (from the server). */
  landed?: { index: number; coins: number; nextReset: string; streakBonus: number } | null;
}) {
  const n = slices.length;
  const step = 360 / n;
  // At rest the pointer sits in the middle of the first slice, or of today's result.
  const [rotation, setRotation] = useState(() => 360 - ((landed?.index ?? 0) * step + step / 2));
  const [spun, setSpun] = useState<SpinResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [, startTransition] = useTransition();
  const result: SpinResult | null =
    spun ?? (landed ? { ok: true, index: landed.index, label: slices[landed.index]?.label ?? "", coins: landed.coins, streakBonus: landed.streakBonus, nextReset: landed.nextReset } : null);
  const done = result?.ok === true;

  function spin() {
    if (spinning || done || !canSpin) return;
    setSpinning(true);
    setSpun(null);
    startTransition(async () => {
      const r = await spinToday();
      if (!r.ok) {
        setSpun(r);
        setSpinning(false);
        return;
      }
      // Bring slice r.index under the pointer after several full turns.
      const target = 360 * 7 + (360 - (r.index * step + step / 2));
      setRotation((prev) => prev - (((prev % 360) + 360) % 360) + target);
      setTimeout(() => {
        setSpun(r);
        setSpinning(false);
        // Reload into the result view (?eredmeny=1, so the page doesn't send the player away). A
        // real reload, because a soft refresh didn't redraw the header: this way the balance in
        // the header and the streak are fresh. The wheel comes back resting on the won slice.
        window.location.replace(`${routes.dailySpin}?eredmeny=1${r.streakBonus > 0 ? `&bonusz=${r.streakBonus}` : ""}`);
      }, SPIN_MS);
    });
  }

  const bulbs = 24;

  return (
    <div className="space-y-5">
      <div className={`wheel-stage ${spinning ? "is-spinning" : ""} ${done ? "is-done" : ""}`}>
        <svg className="wheel-pointer" viewBox="0 0 40 52" aria-hidden>
          <defs>
            <linearGradient id="wp-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff1b8" />
              <stop offset="0.5" stopColor="#e5b23f" />
              <stop offset="1" stopColor="#8a5a12" />
            </linearGradient>
          </defs>
          <path d="M20 50 L4 14 A17 17 0 1 1 36 14 Z" fill="url(#wp-gold)" stroke="#3b2505" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="20" cy="15" r="6" fill="#3b2505" />
          <circle cx="20" cy="15" r="3" fill="#fff6d6" />
        </svg>

        <svg className="wheel-frame" viewBox="0 0 300 300" aria-hidden>
          <defs>
            <radialGradient id="wf-rim" cx="0.5" cy="0.35" r="0.75">
              <stop offset="0.82" stopColor="#f6d77a" />
              <stop offset="0.9" stopColor="#c58f22" />
              <stop offset="1" stopColor="#6e4508" />
            </radialGradient>
            <radialGradient id="wf-bulb">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.45" stopColor="#fff1b0" />
              <stop offset="1" stopColor="#f0b93a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C} r="148" fill="url(#wf-rim)" />
          <circle cx={C} cy={C} r="136" fill="#120f18" />
          {Array.from({ length: bulbs }, (_, i) => {
            const [x, y] = point((i * 360) / bulbs, 142);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4.6" fill="#5a3606" />
                <circle className={`bulb ${i % 2 ? "b" : "a"}`} cx={x} cy={y} r="3.6" fill="url(#wf-bulb)" />
              </g>
            );
          })}
        </svg>

        <svg className="wheel" viewBox="0 0 300 300" style={{ transform: `rotate(${rotation}deg)` }} aria-hidden>
          <defs>
            {slices.map((_, i) => {
              const [light, dark] = COLORS[i % COLORS.length];
              return (
                <radialGradient key={i} id={`ws-${i}`} cx={C} cy={C} r={R} gradientUnits="userSpaceOnUse">
                  <stop offset="0.25" stopColor={dark} />
                  <stop offset="0.85" stopColor={light} />
                  <stop offset="1" stopColor={dark} />
                </radialGradient>
              );
            })}
          </defs>
          {slices.map((s, i) => {
            const [x1, y1] = point(i * step, R);
            const [x2, y2] = point((i + 1) * step, R);
            const mid = i * step + step / 2;
            const [tx, ty] = point(mid, 86);
            return (
              <g key={i}>
                <path d={`M${C} ${C} L${x1} ${y1} A${R} ${R} 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={`url(#ws-${i})`} />
                {s.coins > 0 ? (
                  // "15 (coin)" so players see what each slice pays in DTHU coins
                  <g transform={`rotate(${mid} ${tx} ${ty})`}>
                    <text x={tx + 1} y={ty} textAnchor="end" dominantBaseline="central" className="wheel-label" fontSize={26}>
                      {s.coins}
                    </text>
                    <DthuCoin size={24} x={tx + 3} y={ty - 12} />
                  </g>
                ) : (
                  <text x={tx} y={ty} transform={`rotate(${mid} ${tx} ${ty})`} textAnchor="middle" dominantBaseline="central" className="wheel-label" fontSize={15}>
                    {s.label}
                  </text>
                )}
              </g>
            );
          })}
          {slices.map((_, i) => {
            const [x, y] = point(i * step, R);
            return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="#f2cf72" strokeWidth="2" strokeOpacity="0.85" />;
          })}
          <circle cx={C} cy={C} r={R} fill="none" stroke="#f2cf72" strokeWidth="3" />
        </svg>

        <button
          type="button"
          className="wheel-hub"
          onClick={spin}
          disabled={!canSpin || spinning || done}
          aria-label={canSpin ? "Pörgetés" : "Lépj be a pörgetéshez"}
        >
          {done ? (
            <span className="hub-result">
              {result.coins > 0 ? (
                <>
                  <DthuCoin size={30} />+{result.coins}
                </>
              ) : (
                "–"
              )}
            </span>
          ) : spinning ? (
            "Pörög…"
          ) : (
            "Pörgetés"
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
        {result && !result.ok && <p className="alert-error">{result.error}</p>}
        {done && (
          <>
            <p className="text-xl font-bold">
              {result.coins > 0 ? `Nyertél: +${result.coins} DTHU coin!` : "Most nem nyertél, holnap újra próbálhatod."}
            </p>
            {result.streakBonus > 0 && (
              <p className="font-bold">Sorozat teljesítve: +{result.streakBonus} bónusz coin a nyereményed mellé!</p>
            )}
            <p className="muted text-sm">
              Újra pörgethetsz: <ResetCountdown target={result.nextReset} />
            </p>
            <Link href={routes.games} className="btn btn-secondary">
              Vissza a játékokhoz
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
