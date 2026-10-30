"use client";

export const KARNYX_URL = "https://karnyx.app/";

/** Opens Karnyx next to our site. It can't be embedded: karnyx.app forbids framing (X-Frame-Options). */
export function KarnyxLauncher() {
  function openWindow() {
    const w = Math.min(1280, screen.availWidth - 40);
    const h = Math.min(960, screen.availHeight - 60);
    window.open(KARNYX_URL, "karnyx", `popup,width=${w},height=${h},left=20,top=20`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn" onClick={openWindow}>
        Karnyx megnyitása külön ablakban
      </button>
      <a className="btn btn-secondary" href={KARNYX_URL} target="_blank" rel="noopener noreferrer">
        Megnyitás új lapon
      </a>
    </div>
  );
}
