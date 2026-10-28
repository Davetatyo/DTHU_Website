import { describe, expect, it } from "vitest";
import { resolveView } from "./view";

describe("resolveView", () => {
  it("prefers the URL, then the remembered choice, then the default", () => {
    expect(resolveView("kartyak", "lista", "lista")).toBe("kartyak");
    expect(resolveView(undefined, "kartyak", "lista")).toBe("kartyak");
    expect(resolveView(undefined, undefined, "lista")).toBe("lista");
  });

  it("ignores unknown values", () => {
    expect(resolveView("grid", "x", "kartyak")).toBe("kartyak");
  });
});
