import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { FormDefinition } from "@shared/contracts/forms";
import { validateSubmissionAnswers } from "@shared/contracts/validate-answers";

describe("validateSubmissionAnswers", () => {
  const optionA = randomUUID();
  const optionB = randomUUID();
  const shortTextId = randomUUID();
  const selectId = randomUUID();

  const definition: FormDefinition = {
    title: "Demo",
    questions: [
      {
        id: shortTextId,
        type: "shortText",
        prompt: "Name",
        required: true,
      },
      {
        id: selectId,
        type: "singleSelect",
        prompt: "Color",
        required: false,
        options: [
          { id: optionA, label: "Red" },
          { id: optionB, label: "Blue" },
        ],
      },
    ],
  };

  it("accepts a complete valid submission", () => {
    const issues = validateSubmissionAnswers(definition, {
      formRevision: 1,
      answers: [
        { questionId: shortTextId, type: "shortText", value: "Sam" },
        { questionId: selectId, type: "singleSelect", value: optionA },
      ],
    });
    expect(issues).toEqual([]);
  });

  it("flags missing required answers and invalid options", () => {
    const issues = validateSubmissionAnswers(definition, {
      formRevision: 1,
      answers: [
        {
          questionId: selectId,
          type: "singleSelect",
          value: randomUUID(),
        },
      ],
    });
    expect(issues.some((issue) => issue.message.includes("required"))).toBe(true);
    expect(issues.some((issue) => issue.message.includes("available options"))).toBe(
      true,
    );
  });
});
