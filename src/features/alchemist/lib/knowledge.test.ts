import { beforeAll, describe, expect, it } from "vitest";
import { glossary } from "@/features/rulebook/lib/glossary";
import { match, setKnowledge } from "./matcher";
import { reply } from "./reply";

// With the Szabálytár's heroes and tokens (as on the chat page).
describe("Alchemist with the Szabálytár glossary", () => {
  beforeAll(() => setKnowledge(glossary()));
  const top = (q: string) => match(q).res[0]?.it.id;
  const fixed = () => 0;

  it("answers about the newer heroes with a link to their page", () => {
    expect(top("Mit tud a Druida?")).toBe("h-druid");
    expect(top("Mi a Kovácsmester fegyvere?")).toBe("h-forgemaster");
    expect(top("Milyen a Misztikus Bunyós?")).toBe("h-mystic-brawler");
    expect(top("Ki az a Sun Elf?")).toBe("h-sun-elf");
    const r = reply("Mit tud a Párbajhős?", fixed);
    expect(r.html).toContain("Penge");
    expect(r.link?.[0]).toBe("/szabalytar/hosok/duelist");
  });

  it("answers about tokens", () => {
    expect(top("Hogyan működik a Napóra?")).toBe("t-sun-dial");
    expect(top("Mit csinál a Regenerate jelző?")).toBe("t-regenerate");
    expect(reply("Mit csinál a Wound?", fixed).link?.[0]).toBe("/szabalytar/tokenek/wound");
  });

  it("still finds the rules", () => {
    expect(top("Mennyi lap lehet a kezemben?")).toBe("r-eldobas");
    expect(match("Hogyan állíthatom meg az ultimatet?").res[0].it.title).toMatch(/ultimate/i);
  });

  it("knows how many heroes there are", () => {
    expect(reply("Hány hős van?", fixed).html).toContain(`${glossary().heroes.length} hőst`);
  });

  it("no longer talks about tickets or the shop", () => {
    expect(match("Hogyan szerzek jegyet?").res.some((r) => /jegy|bolt/i.test(r.it.a))).toBe(false);
    expect(reply("Mire válthatom be a jegyeimet a boltban?", fixed).unanswered).toBeDefined();
  });
});
