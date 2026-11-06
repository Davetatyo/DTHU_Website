import type { Metadata } from "next";
import { getAdminView } from "@/lib/auth";
import { ChampionshipTabs } from "@/features/championships/components/ChampionshipTabs";

export const metadata: Metadata = {
  title: { default: "Bajnokságok", template: "%s · Bajnokságok · DTHU" },
  description: "Dice Throne online bajnokságok: jelentkezés, párosítás, időpont egyeztetés, eredmények.",
};

// Shell of Bajnokságok: its own sub-tabs above every page of the tab.
export default async function ChampionshipsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="space-y-5">
      <ChampionshipTabs admin={await getAdminView()} />
      {children}
    </div>
  );
}
