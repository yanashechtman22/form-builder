import { describe, expect, it } from "vitest";
import { checkboxLabel, type Question } from "@shared/contracts/questions";
import { formatAnswerValue } from "@/features/responses/utils/format-answer";

describe("formatAnswerValue", () => {
  it("formats choice answers with option labels", () => {
    const question: Question = {
      id: "11111111-1111-4111-8111-111111111111",
      type: "singleSelect",
      prompt: "Color",
      required: true,
      options: [
        { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", label: "Green" },
        { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", label: "Blue" },
      ],
    };

    expect(
      formatAnswerValue(question, {
        questionId: question.id,
        type: "singleSelect",
        value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).toBe("Green");
  });

  it("uses the checkbox label when the box is checked", () => {
    const question: Question = {
      id: "11111111-1111-4111-8111-111111111111",
      type: "checkbox",
      prompt: "Terms",
      label: "I agree",
      required: true,
    };
    expect(checkboxLabel(question)).toBe("I agree");
    expect(
      formatAnswerValue(question, {
        questionId: question.id,
        type: "checkbox",
        value: true,
      }),
    ).toBe("I agree");
    expect(
      formatAnswerValue(question, {
        questionId: question.id,
        type: "checkbox",
        value: false,
      }),
    ).toBe("No");
  });

  it("shows a clear empty state", () => {
    const question: Question = {
      id: "11111111-1111-4111-8111-111111111111",
      type: "shortText",
      prompt: "Notes",
      required: false,
    };
    expect(formatAnswerValue(question, undefined)).toBe("No response");
  });
});
