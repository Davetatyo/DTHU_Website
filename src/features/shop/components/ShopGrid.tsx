"use client";

import { useEffect, useState } from "react";
import { Art } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { SHOP, SHOPART } from "../data/items";
import "../shop.css";

const KEY = "dthu:wish";

/** Shop items with an "Érdekel" toggle. Until the shop opens, the wishlist lives in this browser. */
export function ShopGrid({ balance }: { balance: number | null }) {
  const [wish, setWish] = useState<number[]>([]);
  useEffect(() => {
    try {
      setWish(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {}
  }, []);
  function toggle(i: number) {
    const next = wish.includes(i) ? wish.filter((x) => x !== i) : [...wish, i];
    setWish(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="strip">
        <span className="pill">
          <span className="chip warn">Hamarosan nyílik</span>
        </span>
        {balance !== null && (
          <span className="pill">
            <Icon id="ticket" className="tok" /> Egyenleg: <b>{balance}</b>
          </span>
        )}
        <span className="pill">
          Megjelölve: <b>{wish.length}</b>
        </span>
      </div>
      <div className="cards tall">
        {SHOP.map((s, i) => {
          const on = wish.includes(i);
          return (
            <div key={s.t} className="tile">
              <Art spec={SHOPART[i]} />
              <span className="badge-tr price">
                <Icon id="ticket" className="tok" /> {s.p}
              </span>
              <div className="in">
                <h3>{s.t}</h3>
                <span className="sub">{s.d}</span>
                <div>
                  <button type="button" className={`btn btn-sm ${on ? "" : "btn-secondary"}`} aria-pressed={on} onClick={() => toggle(i)}>
                    {on ? "Megjelölve" : "Érdekel"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
