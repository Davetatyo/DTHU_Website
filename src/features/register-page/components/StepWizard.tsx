"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { REGISTRATION_STEPS } from "@/features/register-page/lib/steps";

const TOTAL = REGISTRATION_STEPS.length;

export function StepWizard({ loginUrl }: { loginUrl: string }) {
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState(false);

  function next() {
    if (current < TOTAL - 1) {
      setCurrent(current + 1);
    } else {
      setCompleted(true);
    }
  }

  function prev() {
    if (completed) {
      setCompleted(false);
    } else if (current > 0) {
      setCurrent(current - 1);
    }
  }

  if (completed) {
    return (
      <div className="wiz-wrap">
        <div className="wiz-card wiz-final">
          <span className="brand-die mx-auto" style={{ width: 64, height: 64 }} aria-hidden />
          <h3>Készen állsz!</h3>
          <p>
            Most már tudod, hogyan működik a rendszer. Kattints a gombra, lépj be
            Discorddal, töltsd ki a profilodat, és máris egyeztethetsz meccset.
          </p>
          <Link href={loginUrl} className="btn btn-discord wiz-login-btn">
            Belépés Discorddal
          </Link>
          <button type="button" className="btn btn-quiet btn-sm" onClick={prev}>
            ‹ Vissza a lépésekhez
          </button>
        </div>
        <div className="wiz-dots">
          {REGISTRATION_STEPS.map((_, i) => (
            <span key={i} className="wiz-dot done" />
          ))}
          <span className="wiz-dot active" />
        </div>
      </div>
    );
  }

  const step = REGISTRATION_STEPS[current];

  return (
    <div className="wiz-wrap">
      <div className="wiz-card">
        <div className="wiz-num">{step.number} / {TOTAL}</div>
        <Icon id={step.iconId} className="step-icon" />
        <h3>{step.title}</h3>
        <p className="wiz-desc">{step.description}</p>
        <div className="wiz-detail">{step.detail}</div>
      </div>
      <div className="wiz-dots">
        {REGISTRATION_STEPS.map((_, i) => (
          <span
            key={i}
            className={`wiz-dot${i < current ? " done" : i === current ? " active" : ""}`}
          />
        ))}
      </div>
      <div className="wiz-nav">
        {current > 0 ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={prev}>
            ‹ Előző
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="btn btn-sm" onClick={next}>
          {current < TOTAL - 1 ? "Következő ›" : "Értem, tovább! ›"}
        </button>
      </div>
    </div>
  );
}
