"use client";

import { useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { bookmarkletHref } from "../lib/bookmarklet";

/**
 * The "DTHU párosítás-másoló" bookmark. React refuses javascript: URLs in JSX, so the link gets
 * its href after mounting. Clicking it here does nothing; it is meant to be dragged to the
 * bookmarks bar and clicked on the Karnyx round page.
 */
export function KarnyxBookmarklet() {
  const link = useRef<HTMLAnchorElement>(null);
  const [href, setHref] = useState("");
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const h = bookmarkletHref();
    link.current?.setAttribute("href", h);
    setHref(h);
  }, []);

  return (
    <div className="space-y-3">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>
          Húzd a lenti sárga gombot a böngésző <b>könyvjelzősávjára</b> (egyszer kell).
        </li>
        <li>A Karnyxban (belépve) nyisd meg a verseny új fordulójának párosításait.</li>
        <li>
          Kattints a könyvjelzőre: a párosítások a <b>vágólapra</b> kerülnek (ha a böngésző nem engedi, egy dobozban
          jelennek meg, onnan másold ki).
        </li>
        <li>
          Itt az <b>Admin felület</b> → „Új forduló párosítása” mezőbe illeszd be, a Bye játékosokat írd be külön, és nézd
          át az előnézetet indítás előtt.
        </li>
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <a
          ref={link}
          className="btn"
          draggable
          onClick={(e) => {
            e.preventDefault();
            setHint(true);
          }}
        >
          DTHU párosítás-másoló
        </a>
        {href && <CopyButton text={href} label="Kód másolása (kézi könyvjelzőhöz)" />}
      </div>
      {hint && (
        <p className="alert-info text-sm">
          Ezt a gombot ne itt nyomd meg: húzd a könyvjelzősávra, és a Karnyx oldalán kattints rá. Ha nem lehet húzni (pl.
          telefonon), a „Kód másolása” után hozz létre egy új könyvjelzőt, és a címébe illeszd be a kódot.
        </p>
      )}
    </div>
  );
}
