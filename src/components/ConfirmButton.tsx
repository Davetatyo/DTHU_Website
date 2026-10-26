"use client";

/** Submit button that asks for confirmation first (for actions that ping many people). */
export function ConfirmButton({
  label,
  confirm,
  className = "btn",
  disabled,
}: {
  label: string;
  confirm: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={className}
      disabled={disabled}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
