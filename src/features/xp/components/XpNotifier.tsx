"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgedAvatar } from "@/features/profile/components/BadgedAvatar";
import { setTestBadge } from "@/features/profile/actions/badge";
import { findBadge } from "@/features/profile/lib/badges";
import type { LevelInfo } from "../lib/levels";
import { markXpSeen } from "../actions/seen";
import { XpBar } from "./XpBar";
import "../xp.css";

export type XpNotice = {
  gained: number;
  /** What it was for: one label, or the first one and how many more. */
  text: string;
  before: LevelInfo;
  after: LevelInfo;
  /** Badge id for the newest level reached that has one. */
  rewardId: string | null;
};

/** Shows new XP once: the corner card, or the level-up popup when a level was reached. */
export function XpNotifier({ notice, avatarUrl }: { notice: XpNotice; avatarUrl: string | null }) {
  const [open, setOpen] = useState(true);
  // Only in the browser: the popups attach to document.body, which the server render doesn't have.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    void markXpSeen();
  }, []);
  if (!open || !mounted) return null;
  const close = () => setOpen(false);
  return notice.after.level > notice.before.level ? (
    <LevelUp notice={notice} avatarUrl={avatarUrl} onClose={close} />
  ) : (
    <Toast notice={notice} onClose={close} />
  );
}

function Toast({ notice, onClose }: { notice: XpNotice; onClose: () => void }) {
  const [pct, setPct] = useState(notice.before.level === notice.after.level ? notice.before.pct : 0);
  useEffect(() => {
    const grow = setTimeout(() => setPct(notice.after.pct), 400);
    const hide = setTimeout(onClose, 5200);
    return () => {
      clearTimeout(grow);
      clearTimeout(hide);
    };
  }, [notice, onClose]);
  return createPortal(
    <div className="xp-toast" role="status">
      <span className="xp-toast-amt">
        {notice.gained > 0 ? "+" : ""}
        {notice.gained} XP
      </span>
      <div className="xp-toast-body">
        <b>{notice.text}</b>
        <XpBar info={notice.after} pct={pct} />
        <small>
          {notice.after.need} XP a {notice.after.level + 1}. szintig
        </small>
      </div>
      <button type="button" className="xp-toast-x" aria-label="Bezárás" onClick={onClose}>
        ×
      </button>
    </div>,
    document.body,
  );
}

/**
 * Fireworks on a canvas over the page. `pulse` going up fires one burst (a level reached on the
 * way); `finale` starts the full show (the last level).
 */
function Fireworks({ pulse, finale }: { pulse: number; finale: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ burst: (x: number, y: number, n?: number) => void; show: () => void } | null>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current!;
    const g = canvas.getContext("2d")!;
    const fit = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    fit();
    const colors = ["#f2c95a", "#ffe29a", "#ff8a3d", "#ffffff", "#b18cff", "#ff5f6d"];
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; c: string }[] = [];
    let showUntil = 0;
    let frame = 0;
    let raf = 0;
    let running = false;
    const burst = (x: number, y: number, n = 70) => {
      const c = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 4.5;
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: Math.random() < 0.7 ? c : "#ffffff" });
      }
      start();
    };
    const loop = () => {
      frame++;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (frame < showUntil && frame % 22 === 1) burst(w * (0.15 + Math.random() * 0.7), h * (0.12 + Math.random() * 0.4));
      g.clearRect(0, 0, w, h);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.vx *= 0.985;
        p.life -= 0.013;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        g.globalAlpha = p.life;
        g.fillStyle = p.c;
        g.beginPath();
        g.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      if (frame < showUntil || sparks.length) raf = requestAnimationFrame(loop);
      else running = false;
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    api.current = {
      burst,
      show: () => {
        showUntil = frame + 260;
        start();
      },
    };
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    if (pulse > 0) api.current?.burst(window.innerWidth / 2, window.innerHeight * 0.3, 45);
  }, [pulse]);
  useEffect(() => {
    if (finale) api.current?.show();
  }, [finale]);

  return <canvas ref={ref} className="lu-fw" aria-hidden />;
}

type Segment = { level: number; fromPct: number; toPct: number; fromXp: number; toXp: number };

/** One stretch of the bar per level: from where the player was, through every level, to where they are. */
function segments(notice: XpNotice): Segment[] {
  const { before, after } = notice;
  const out: Segment[] = [];
  let xp = before.total;
  for (let level = before.level; level <= after.level; level++) {
    const last = level === after.level;
    const fromPct = level === before.level ? before.pct : 0;
    const toPct = last ? after.pct : 100;
    const toXp = last ? after.total : xp + Math.round(((toPct - fromPct) / 100) * levelSize(notice, level));
    out.push({ level, fromPct, toPct, fromXp: xp, toXp });
    xp = toXp;
  }
  return out;
}

/** XP size of a level, worked out from the two known levels (the curve itself isn't sent). */
function levelSize(notice: XpNotice, level: number): number {
  const { before, after } = notice;
  const step = after.level > before.level ? (after.to - after.from - (before.to - before.from)) / (after.level - before.level) : 0;
  return before.to - before.from + step * (level - before.level);
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The level-up popup. The bar fills level by level: every time it's full the level number jumps
 * with a small burst, the bar starts again, and the full fireworks come with the last level.
 */
function LevelUp({ notice, avatarUrl, onClose }: { notice: XpNotice; avatarUrl: string | null; onClose: () => void }) {
  const parts = useRef(segments(notice)).current;
  const reached = parts.slice(1).map((p) => p.level);
  const reward = findBadge(notice.rewardId);
  const [level, setLevel] = useState(notice.before.level);
  // The bar's level lags behind the number: the full bar keeps its numbers until it starts again.
  const [barLevel, setBarLevel] = useState(notice.before.level);
  const [pct, setPct] = useState(notice.before.pct);
  const [shown, setShown] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [done, setDone] = useState(false);
  const [bump, setBump] = useState(0);
  const skip = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const finish = () => {
      setLevel(notice.after.level);
      setBarLevel(notice.after.level);
      setPct(notice.after.pct);
      setShown(notice.gained);
      setDone(true);
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    // Faster per level when many levels come at once, so it never drags on.
    const fill = Math.max(450, Math.min(950, 3200 / parts.length));
    const pause = 420;
    const startXp = notice.before.total;
    // A plain timer rather than requestAnimationFrame: it keeps going if the tab is briefly hidden.
    let index = 0;
    let t0 = performance.now() + 500;
    let timer = 0;
    const stop = () => window.clearInterval(timer);
    const tick = () => {
      const now = performance.now();
      if (skip.current) return stop(), finish();
      if (now < t0) return; // the short pause on a full bar after a level
      const part = parts[index];
      const t = Math.min(1, Math.max(0, (now - t0) / fill));
      const e = ease(t);
      setPct(part.fromPct + (part.toPct - part.fromPct) * e);
      setShown(Math.round(part.fromXp + (part.toXp - part.fromXp) * e - startXp));
      if (t < 1) return;
      if (index === parts.length - 1) return stop(), finish();
      // A level is full: bump the number, a small burst, then the bar starts again from empty.
      index++;
      setLevel(parts[index].level);
      setBump((b) => b + 1);
      setPulse((p) => p + 1);
      t0 = now + pause;
      const next = parts[index].level;
      setTimeout(() => {
        setPct(0);
        setBarLevel(next);
      }, pause * 0.6);
    };
    timer = window.setInterval(tick, 16);
    return stop;
  }, [notice, parts]);

  const sizeNow = levelSize(notice, barLevel);
  return createPortal(
    <div className="lu" role="dialog" aria-modal="true" aria-label={`Elérted a ${notice.after.level}. szintet`}>
      <Fireworks pulse={pulse} finale={done} />
      <div className="lu-card">
        <div className="lu-rays" aria-hidden />
        <div className="lu-kicker">{reached.length > 1 ? `Szintlépés ×${reached.length}!` : "Szintlépés!"}</div>
        <div key={bump} className={`lu-num${bump ? " bump" : ""}`}>
          {level}
        </div>
        <div className="lu-gain">+{shown} XP</div>
        <div className="lu-bar">
          <XpBar info={{ ...notice.after, level: barLevel, from: 0, to: sizeNow, into: Math.round((pct / 100) * sizeNow) }} pct={pct} big />
        </div>
        {reached.length > 1 && (
          <div className="lu-track" aria-hidden>
            {reached.map((l) => (
              <span key={l} className={`lu-chip${l <= level ? " on" : ""}`}>
                {l}
              </span>
            ))}
          </div>
        )}
        <div className={`lu-end${done ? " show" : ""}`}>
          <div className="lu-title">Gratulálunk, elérted a {notice.after.level}. szintet!</div>
          {reward ? (
            <div className="lu-reward">
              <BadgedAvatar badge={reward} picture={92} avatarUrl={avatarUrl} />
              <div className="lu-reward-text">
                <small>Új jelvény</small>
                <b>{reward.name}</b>
              </div>
            </div>
          ) : (
            <p className="lu-plain">
              Még {notice.after.need} XP a {notice.after.level + 1}. szintig
            </p>
          )}
          <div className="lu-actions">
            {reward && (
              // Test phase: wearing works like the admin try-on (XP is admins only). The Gyűjtemény replaces it.
              <form action={setTestBadge} onSubmit={() => setTimeout(onClose, 50)}>
                <input type="hidden" name="badge" value={reward.id} />
                <button type="submit" className="btn">
                  Felveszem
                </button>
              </form>
            )}
            <button type="button" className={reward ? "btn btn-secondary" : "btn"} onClick={onClose}>
              {reward ? "Később" : "Szuper!"}
            </button>
          </div>
        </div>
        {!done && (
          <button type="button" className="lu-skip" onClick={() => (skip.current = true)}>
            Átugrás ›
          </button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {done ? `Elérted a ${notice.after.level}. szintet, +${notice.gained} XP` : ""}
      </span>
    </div>,
    document.body,
  );
}
