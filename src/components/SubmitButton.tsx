"use client";

import { useFormStatus } from "react-dom";

// Submit button for server-action forms. While the action runs it disables itself, shows an
// hourglass, and covers the page with a blurred overlay so nothing can be submitted twice.

export function SubmitButton({
  children,
  className = "btn",
  disabled,
  confirm,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** Asks for confirmation before submitting (for actions that ping or delete). */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        className={className}
        disabled={disabled || pending}
        aria-busy={pending}
        onClick={(e) => {
          if (confirm && !window.confirm(confirm)) e.preventDefault();
        }}
      >
        {pending && (
          <span className="hourglass" aria-hidden>
            ⏳
          </span>
        )}
        {children}
      </button>
      {pending && <BusyOverlay />}
    </>
  );
}

function BusyOverlay() {
  return (
    <div className="busy-overlay" role="status" aria-live="polite">
      <div className="busy-box">
        <span className="hourglass text-3xl" aria-hidden>
          ⏳
        </span>
        <span className="font-semibold">Folyamatban…</span>
      </div>
    </div>
  );
}
