"use client";

/** Light/dark switch. Overrides the OS setting; remembered in localStorage (read early in app/layout.tsx). */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("dthu:theme", next);
    } catch {}
  }

  return (
    <button type="button" onClick={toggle} className="tb-btn icon theme-btn" title="Világos / sötét téma" aria-label="Világos / sötét téma váltása">
      <svg className="moon" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" />
      </svg>
      <svg className="sun" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
