import { describe, expect, it } from "vitest";
import type { SubmissionDto } from "../../../shared/contracts/submissions";
import { summarizeSubmissions } from "../../../src/features/responses/utils/response-summaries";

const formId = "33333333-3333-4333-8333-333333333333";
const questionId = "22222222-2222-4222-8222-222222222222";
const optionId = "11111111-1111-4111-8111-111111111111";

function sizeSubmission(id: string, label: string, prompt: string, submittedAt: string): SubmissionDto {
  return {
    id,
    formId,
    formRevision: 1,
    submittedAt,
    formSnapshot: {
      title: "Sizes",
      questions: [
        {
          id: questionId,
          type: "singleSelect",
          prompt,
          required: true,
          options: [{ id: optionId, label }],
        },
      ],
    },
    answers: [{ questionId, type: "singleSelect", value: optionId }],
  };
}

describe("summarizeSubmissions", () => {
  it("counts a renamed option under each label it had", () => {
    const newer = sizeSubmission(
      "44444444-4444-4444-8444-444444444444",
      "S",
      "Shirt size now",
      "2026-02-02T00:00:00.000Z",
    );
    const older = sizeSubmission(
      "55555555-5555-4555-8555-555555555555",
      "Small",
      "Shirt size then",
      "2026-01-01T00:00:00.000Z",
    );

    const [block] = summarizeSubmissions([newer, older]);

    expect(block?.prompt).toBe("Shirt size now");
    expect(block?.rows.map((row) => [row.label, row.count])).toEqual([
      ["Small", 1],
      ["S", 1],
    ]);
  });
});
