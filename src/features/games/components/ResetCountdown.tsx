"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatCountdown } from "../lib/daily";

/**
 * "05:12:33" counting down to `target` (the next 00:00 in Budapest, from the server). At zero it
 * refreshes the page, so the card opens again without a reload. Before the first tick (server
 * render) it shows nothing, so server and browser clocks can't disagree.
 */
export function ResetCountdown({ target, className = "" }: { target: string; className?: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => {
      const ms = end - Date.now();
      setLeft(ms);
      if (ms <= 0) router.refresh();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, router]);
  return (
    <span className={`countdown ${className}`} role="timer" aria-live="off">
      {left === null ? " " : formatCountdown(left)}
    </span>
  );
}
