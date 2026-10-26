"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
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
    <button type="button" onClick={copy} className="btn btn-secondary btn-sm">
      {copied ? "✓ Kimásolva" : label}
    </button>
  );
}
