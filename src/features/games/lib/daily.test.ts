import { describe, expect, it } from "vitest";
import { addDays, budapestDay, formatCountdown, isCorrectAnswer, nextDailyReset, normalizeAnswer, visibleStreak, weekdayIndex } from "./daily";

describe("Budapest day and reset", () => {
  it("uses the Budapest calendar day, not UTC", () => {
    // 23:30 UTC on Nov 3 is already 00:30 on Nov 4 in Budapest (CET, UTC+1).
    expect(budapestDay(new Date("2026-11-03T23:30:00Z"))).toBe("2026-11-04");
    expect(budapestDay(new Date("2026-11-03T22:59:00Z"))).toBe("2026-11-03");
    // Summer (CEST, UTC+2): 22:30 UTC on Jul 1 is 00:30 on Jul 2.
    expect(budapestDay(new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
  });

  it("next reset is the coming 00:00 in Budapest", () => {
    expect(nextDailyReset(new Date("2026-11-03T12:00:00Z")).toISOString()).toBe("2026-11-03T23:00:00.000Z");
    expect(nextDailyReset(new Date("2026-07-01T12:00:00Z")).toISOString()).toBe("2026-07-01T22:00:00.000Z");
    // Right after midnight: the reset after that is the next night.
    expect(nextDailyReset(new Date("2026-11-03T23:00:01Z")).toISOString()).toBe("2026-11-04T23:00:00.000Z");
    // The night the clocks go back (Oct 25, 2026): midnight Oct 26 is 23:00 UTC.
    expect(nextDailyReset(new Date("2026-10-25T12:00:00Z")).toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });

  it("addDays and weekdays", () => {
    expect(addDays("2026-12-31")).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(weekdayIndex("2026-11-02")).toBe(0); // Monday
    expect(weekdayIndex("2026-11-08")).toBe(6); // Sunday
  });

  it("formatCountdown", () => {
    expect(formatCountdown(5 * 3600_000 + 12 * 60_000 + 33_000)).toBe("05:12:33");
    expect(formatCountdown(-5)).toBe("00:00:00");
  });
});

describe("answers", () => {
  it("normalizes case, spaces and accents", () => {
    expect(normalizeAnswer("  Piromántus  ")).toBe("piromantus");
    expect(normalizeAnswer("Árnyék   Tolvaj")).toBe("arnyek tolvaj");
  });

  it("text answers match any accepted variant", () => {
    const key = { answer_mode: "text" as const, accepted_answers: ["Pyromancer", "Piromanta"] };
    expect(isCorrectAnswer(key, "pyromancer ")).toBe(true);
    expect(isCorrectAnswer(key, "PIROMÁNTA")).toBe(true);
    expect(isCorrectAnswer(key, "Paladin")).toBe(false);
    expect(isCorrectAnswer(key, "   ")).toBe(false);
  });

  it("multiple choice compares the option index", () => {
    const key = { answer_mode: "multiple_choice" as const, correct_option: 2 };
    expect(isCorrectAnswer(key, "2")).toBe(true);
    expect(isCorrectAnswer(key, "1")).toBe(false);
    expect(isCorrectAnswer(key, "2; drop")).toBe(false);
  });
});

describe("visibleStreak (days counted 1..7)", () => {
  it("counts only when the last completed day is today or yesterday", () => {
    expect(visibleStreak({ current_length: 4, last_completed_date: "2026-11-03" }, "2026-11-03", 7)).toBe(4);
    expect(visibleStreak({ current_length: 4, last_completed_date: "2026-11-02" }, "2026-11-03", 7)).toBe(4);
    expect(visibleStreak({ current_length: 4, last_completed_date: "2026-11-01" }, "2026-11-03", 7)).toBe(0);
    expect(visibleStreak(null, "2026-11-03", 7)).toBe(0);
  });

  it("shows 7/7 on the bonus day and 0 the day after (a new round starts at 1)", () => {
    expect(visibleStreak({ current_length: 7, last_completed_date: "2026-11-03" }, "2026-11-03", 7)).toBe(7);
    expect(visibleStreak({ current_length: 7, last_completed_date: "2026-11-02" }, "2026-11-03", 7)).toBe(0);
  });

  it("accepts a timestamp as the date", () => {
    expect(visibleStreak({ current_length: 2, last_completed_date: "2026-11-03T00:00:00.000Z" }, "2026-11-03", 7)).toBe(2);
  });
});
