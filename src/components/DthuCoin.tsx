import { useId } from "react";

// The DTHU coin: the site's shop currency. A gold coin with a ridged rim and the DTHU die
// (the logo's motif) embossed in the middle. Full colour on purpose (unlike the line icons in
// IconSprite), so it reads as gold in both themes. Decorative unless `title` is given.

export function DthuCoin({ size = 24, title, className }: { size?: number; title?: string; className?: string }) {
  const id = useId().replace(/:/g, "");
  const rim = `${id}-rim`;
  const face = `${id}-face`;
  const shine = `${id}-shine`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={rim} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#fff2b8" />
          <stop offset="0.35" stopColor="#f0bf45" />
          <stop offset="0.75" stopColor="#b9801c" />
          <stop offset="1" stopColor="#7a4c0c" />
        </linearGradient>
        <radialGradient id={face} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#ffe48a" />
          <stop offset="0.55" stopColor="#dca232" />
          <stop offset="1" stopColor="#9a6312" />
        </radialGradient>
        {/* Along the highlight arc: transparent at both ends, brightest in the middle */}
        <linearGradient id={shine} gradientUnits="userSpaceOnUse" x1="12" y1="26" x2="31" y2="11">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rim with a ridged (reeded) edge */}
      <circle cx="32" cy="32" r="30.5" fill={`url(#${rim})`} />
      <circle cx="32" cy="32" r="30.5" fill="none" stroke="#5c3906" strokeOpacity="0.55" strokeWidth="1" />
      <circle cx="32" cy="32" r="28" fill="none" stroke="#6b430a" strokeOpacity="0.45" strokeWidth="2.2" strokeDasharray="1.1 1.9" />

      {/* Face: a sunken disc with a bright inner bevel */}
      <circle cx="32" cy="32" r="24.5" fill={`url(#${face})`} />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="#6b430a" strokeOpacity="0.7" strokeWidth="1.3" />
      <circle cx="32" cy="32" r="23.2" fill="none" stroke="#fff4c8" strokeOpacity="0.55" strokeWidth="0.9" />
      <circle cx="32" cy="32" r="20.5" fill="none" stroke="#7a4c0c" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="0.6 2.4" strokeLinecap="round" />

      {/* Embossed die: top face, left face, right face */}
      <g stroke="#5a3606" strokeWidth="1.1" strokeLinejoin="round">
        <path d="M32 17.5 L44 24 L32 30.5 L20 24 Z" fill="#fff1c2" />
        <path d="M20 24 L32 30.5 L32 45 L20 38.5 Z" fill="#b57a1d" />
        <path d="M32 30.5 L44 24 L44 38.5 L32 45 Z" fill="#e0a73a" />
      </g>
      {/* Pips: 1 on top, 2 on the left, 3 on the right */}
      <g fill="#5a3606">
        <ellipse cx="32" cy="24" rx="2.4" ry="1.3" />
        <ellipse cx="23.3" cy="29.6" rx="1.25" ry="1.6" transform="rotate(-28 23.3 29.6)" />
        <ellipse cx="28.7" cy="39.4" rx="1.25" ry="1.6" transform="rotate(-28 28.7 39.4)" />
        <ellipse cx="35.1" cy="39.9" rx="1.25" ry="1.6" transform="rotate(28 35.1 39.9)" />
        <ellipse cx="38" cy="34.7" rx="1.25" ry="1.6" transform="rotate(28 38 34.7)" />
        <ellipse cx="40.7" cy="28.9" rx="1.25" ry="1.6" transform="rotate(28 40.7 28.9)" />
      </g>

      {/* Light: a soft highlight on the upper left and a small sparkle */}
      <path d="M12.5 26 A21 21 0 0 1 30 11.5" fill="none" stroke={`url(#${shine})`} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M49 9.5 L50.2 13 L53.7 14.2 L50.2 15.4 L49 18.9 L47.8 15.4 L44.3 14.2 L47.8 13 Z" fill="#fffbe6" />
    </svg>
  );
}
