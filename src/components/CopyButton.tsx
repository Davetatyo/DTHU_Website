"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label,
  className = "btn btn-secondary btn-sm",
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Másold ki:", text);
    }
  }

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? "✓ Kimásolva" : label}
    </button>
  );
}
