"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "dthu_onboarding_done";

type OnboardingStep = {
  title: string;
  body: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "Üdvözlünk a DTHU-n!",
    body: "Ez az Időpontfoglaló, ahol a Dice Throne online bajnokság meccseit szervezed. Nézzük végig, hogyan működik!",
  },
  {
    title: "Áttekintés oldal",
    body: "Az Áttekintés az első menüpont: itt látod az aktuális fordulót, a párosításodat, az ellenfeledet és a forduló állását. Ha be vagy lépve, a „Saját meccsem” gomb egyből a meccsedre visz.",
  },
  {
    title: "Időpontjavaslat",
    body: "A meccsoldaladon az „Időpont javaslása” gombbal 1–3 időpontot adhatsz meg. Válassz napot, írd be az órát, és küldd el. Az ellenfeled Discordon kap értesítést.",
  },
  {
    title: "Elfogadás és megerősítés",
    body: "Ha az ellenfeled javasol időpontot, az megjelenik a meccsoldaladon. Kattints az „Elfogadom” gombra — a megerősített időpont Discordon is megjelenik, és naptárba is feliratkozhatsz rá.",
  },
  {
    title: "Közelgő meccsek",
    body: "A második menüpont (Közelgő meccsek) mutatja az összes megerősített meccset időrendi sorrendben. Itt iratkozhatsz fel a naptárra is (Google, Apple, Outlook).",
  },
  {
    title: "GYIK",
    body: "Ha bármi kérdésed van, a harmadik menüpont (GYIK) a leggyakoribb kérdésekre válaszol: hogyan lépj be, hogyan egyeztess időpontot, mit csinálj, ha nem találod a neved.",
  },
];

export function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
  }

  function next() {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!visible) return null;

  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <div className="onboard-overlay" onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <div className="onboard-card" role="dialog" aria-label="Bemutató">
        <div className="onboard-header">
          <span>Bemutató · {step + 1}/{ONBOARDING_STEPS.length}</span>
          <button type="button" onClick={dismiss} aria-label="Bezárás">✕</button>
        </div>
        <div className="onboard-body">
          <h3>{current.title}</h3>
          <p>{current.body}</p>
          <div className="step-indicator">
            {ONBOARDING_STEPS.map((_, i) => (
              <span key={i} className={`step-dot${i === step ? " active" : ""}`} />
            ))}
          </div>
        </div>
        <div className="onboard-footer">
          {step > 0 ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={prev}>
              ‹ Előző
            </button>
          ) : (
            <button type="button" className="btn btn-quiet btn-sm" onClick={dismiss}>
              Kihagyom
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={next}>
            {isLast ? "Értem, kezdjük!" : "Következő ›"}
          </button>
        </div>
      </div>
    </div>
  );
}
