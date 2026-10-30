import { describe, expect, it } from "vitest";
import { reply } from "./reply";

const fixed = () => 0;

describe("reply", () => {
  it("answers a rule question with a link to the rule", () => {
    const r = reply("Mennyi lap lehet a kezemben a kör végén?", fixed);
    expect(r.html).toContain("6 lap");
    expect(r.link?.[0]).toBe("/szabalytar/eldobas");
  });
  it("introduces itself", () => {
    expect(reply("Ki vagy te?", fixed).html).toContain("Alkimista");
  });
  it("offers to send unknown questions to the admins", () => {
    const r = reply("zxqw blorp", fixed);
    expect(r.unanswered).toBe("zxqw blorp");
    expect(r.suggestions?.length).toBe(3);
  });
  it("mentions a hero it has no page for yet", () => {
    expect(reply("Milyen a Fekete Párduc?", fixed).link?.[0]).toBe("/szabalytar?tab=hosok");
  });
});
