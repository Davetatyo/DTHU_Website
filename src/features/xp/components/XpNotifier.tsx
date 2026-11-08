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

function Fireworks() {
  const ref = useRef<HTMLCanvasElement>(null);
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
    const burst = (x: number, y: number) => {
      const c = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 70; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 4.5;
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, c: Math.random() < 0.7 ? c : "#ffffff" });
      }
    };
    let frame = 0;
    let raf = 0;
    const loop = () => {
      frame++;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (frame < 260 && frame % 22 === 1) burst(w * (0.15 + Math.random() * 0.7), h * (0.12 + Math.random() * 0.4));
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
      if (frame < 260 || sparks.length) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);
  return <canvas ref={ref} className="lu-fw" aria-hidden />;
}

function LevelUp({ notice, avatarUrl, onClose }: { notice: XpNotice; avatarUrl: string | null; onClose: () => void }) {
  const level = notice.after.level;
  const reward = findBadge(notice.rewardId);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div className="lu" role="dialog" aria-modal="true" aria-label={`Elérted a ${level}. szintet`}>
      <Fireworks />
      <div className="lu-card">
        <div className="lu-rays" aria-hidden />
        <div className="lu-kicker">Szintlépés!</div>
        <div className="lu-num">{level}</div>
        <div className="lu-title">Gratulálunk, elérted a {level}. szintet!</div>
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
            +{notice.gained} XP · még {notice.after.need} XP a {level + 1}. szintig
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
    </div>,
    document.body,
  );
}
