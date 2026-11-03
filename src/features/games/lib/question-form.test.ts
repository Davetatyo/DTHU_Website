import { describe, expect, it } from "vitest";
import type { QuestionRow } from "./daily-types";
import { changedLockedFields, findDuplicate, parseQuestionForm } from "./question-form";

const today = "2026-11-03";
const mc = { type: "trivia", prompt: "Hány kockával dob a hős?", answer_mode: "multiple_choice", option0: "4", option1: "5", option2: "", option3: "6", correct_option: "3", status: "scheduled" };

describe("parseQuestionForm", () => {
  it("multiple choice: drops empty options and re-indexes the correct one", () => {
    const r = parseQuestionForm(mc, today);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.options).toEqual(["4", "5", "6"]);
      expect(r.value.correct_option).toBe(2);
    }
  });

  it("multiple choice: refuses too few options, duplicates and an empty correct pick", () => {
    expect(parseQuestionForm({ ...mc, option1: "", option3: "" , correct_option: "0"}, today).ok).toBe(false);
    expect(parseQuestionForm({ ...mc, option1: "4 " }, today).ok).toBe(false);
    expect(parseQuestionForm({ ...mc, correct_option: "2" }, today).ok).toBe(false);
  });

  it("text: one accepted answer per line", () => {
    const r = parseQuestionForm({ type: "rules", prompt: "Ki?", answer_mode: "text", accepted_answers: "Piromanta\n\n Pyromancer \n" }, today);
    expect(r.ok && r.value.accepted_answers).toEqual(["Piromanta", "Pyromancer"]);
    expect(parseQuestionForm({ type: "rules", prompt: "Ki?", answer_mode: "text", accepted_answers: " \n" }, today).ok).toBe(false);
  });

  it("refuses champion_zoom for now, past dates and dated drafts", () => {
    expect(parseQuestionForm({ ...mc, type: "champion_zoom" }, today).ok).toBe(false);
    expect(parseQuestionForm({ ...mc, publish_date: "2026-11-02" }, today).ok).toBe(false);
    expect(parseQuestionForm({ ...mc, status: "draft", publish_date: "2026-11-05" }, today).ok).toBe(false);
    expect(parseQuestionForm({ ...mc, publish_date: "2026-11-03" }, today).ok).toBe(true);
  });

  it("reward override: empty, a number, or refused", () => {
    expect(parseQuestionForm({ ...mc, reward_override: "" }, today).ok && true).toBe(true);
    const r = parseQuestionForm({ ...mc, reward_override: "5" }, today);
    expect(r.ok && r.value.reward_override).toBe(5);
    expect(parseQuestionForm({ ...mc, reward_override: "-1" }, today).ok).toBe(false);
  });
});

describe("locks and duplicates", () => {
  it("lists changed locked fields", () => {
    const saved = { answer_mode: "multiple_choice", options: ["4", "5", "6"], correct_option: 2, accepted_answers: null, difficulty: "normal", reward_override: null } as unknown as QuestionRow;
    const r = parseQuestionForm(mc, today);
    if (!r.ok) throw new Error(r.error);
    expect(changedLockedFields(saved, r.value)).toEqual([]);
    expect(changedLockedFields(saved, { ...r.value, correct_option: 0, difficulty: "hard" })).toEqual(["correct_option", "difficulty"]);
  });

  it("finds a duplicate prompt, ignoring case and accents, but not itself", () => {
    const others = [{ id: "a", prompt: "Hány kockával dob a hős?" }];
    expect(findDuplicate("hany kockaval dob a hos?", others)?.id).toBe("a");
    expect(findDuplicate("hany kockaval dob a hos?", others, "a")).toBeNull();
  });
});
