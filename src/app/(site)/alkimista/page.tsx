import type { Metadata } from "next";
import { Chat } from "@/features/alchemist/components/Chat";
import { glossary } from "@/features/rulebook/lib/glossary";

export const metadata: Metadata = { title: "Alkimista" };

export default function AlchemistPage() {
  return (
    <div className="space-y-4">
      <div className="sec-h">
        <h1>Kérdezd az Alkimistát</h1>
      </div>
      <Chat knowledge={glossary()} />
    </div>
  );
}
