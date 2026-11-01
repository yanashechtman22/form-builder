import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SHORT_TEXT_ANSWER_MAX } from "@shared/contracts/limits";
import type { Question } from "@shared/contracts/questions";
import {
  buildAnswersFromValues,
  createEmptyAnswerValues,
} from "@/features/form-fill/utils/answer-values";

const questions: Question[] = [
  {
    id: randomUUID(),
    type: "shortText",
    prompt: "Name",
    required: true,
  },
  {
    id: randomUUID(),
    type: "rating",
    prompt: "Score",
    required: false,
    max: 5,
  },
  {
    id: randomUUID(),
    type: "checkbox",
    prompt: "Agree",
    label: "Yes",
    required: true,
  },
];

describe("answer values", () => {
  it("creates empty defaults for each question type", () => {
    const values = createEmptyAnswerValues(questions);
    expect(values[questions[0].id]).toBe("");
    expect(values[questions[1].id]).toBeNull();
    expect(values[questions[2].id]).toBe(false);
  });

  it("requires answers for required questions", () => {
    const values = createEmptyAnswerValues(questions);
    const result = buildAnswersFromValues(questions, values);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.fieldErrors[questions[0].id]).toBeTruthy();
    expect(result.fieldErrors[questions[2].id]).toBeTruthy();
  });

  it("builds typed answers for valid input", () => {
    const values = createEmptyAnswerValues(questions);
    values[questions[0].id] = "Ada";
    values[questions[1].id] = 4;
    values[questions[2].id] = true;

    const result = buildAnswersFromValues(questions, values);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected success");
    }
    expect(result.answers).toHaveLength(3);
    expect(result.answers[0]).toMatchObject({ type: "shortText", value: "Ada" });
  });

  it("rejects numbers outside the question range", () => {
    const numberQuestion: Question = {
      id: randomUUID(),
      type: "number",
      prompt: "Age",
      required: true,
      min: 1,
      max: 10,
    };
    const values = createEmptyAnswerValues([numberQuestion]);
    values[numberQuestion.id] = 16;
    const result = buildAnswersFromValues([numberQuestion], values);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.fieldErrors[numberQuestion.id]).toBe("Must be at most 10");
  });

  it("rejects text answers that exceed the length cap", () => {
    const values = createEmptyAnswerValues(questions);
    values[questions[0].id] = "a".repeat(SHORT_TEXT_ANSWER_MAX + 1);
    values[questions[2].id] = true;

    const result = buildAnswersFromValues(questions, values);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.fieldErrors[questions[0].id]).toMatch(/under/);
  });
});
