import { RulebookViewer } from "@/features/rulebook/components/RulebookViewer";
import { SpriteSheet } from "@/features/rulebook/components/SpriteSheet";
import { allEntries } from "@/features/rulebook/lib/content";
import { entryPath } from "@/features/rulebook/lib/pages";
import "@/features/rulebook/rulepop.css";

/** Every Szabálytár page can open rules, heroes and tokens as popups. */
export default function RulebookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <RulebookViewer paths={allEntries().map(entryPath)} />
      <SpriteSheet />
    </>
  );
}
