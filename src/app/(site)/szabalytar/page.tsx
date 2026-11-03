import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RulebookHome } from "@/features/rulebook/components/RulebookHome";
import { LEGACY_TABS, RULEBOOK_PATH } from "@/features/rulebook/lib/pages";

export const metadata: Metadata = {
  title: "Szabálytár",
  description: "A Dice Throne szabályai magyarul: körök, hősök, tokenek, sebzés, GYIK. Minden szabálynak saját linkje van.",
};

export default async function RulebookPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  if (tab && LEGACY_TABS[tab]) redirect(`${RULEBOOK_PATH}/${LEGACY_TABS[tab]}`);
  return <RulebookHome />;
}
