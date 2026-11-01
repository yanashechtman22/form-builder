import { describe, expect, it } from "vitest";
import {
  issuesForQuestion,
  questionIndexFromIssuePath,
} from "../../../src/features/form-builder/draft/save-issues";

describe("save issue paths", () => {
  it("reads the question index from a nested path", () => {
    expect(questionIndexFromIssuePath("questions.2.options.0.label")).toBe(2);
    expect(questionIndexFromIssuePath("questions.0")).toBe(0);
    expect(questionIndexFromIssuePath("title")).toBeNull();
  });

  it("keeps only issues for that question", () => {
    const issues = [
      { path: "questions.1.prompt", message: "Add a question" },
      { path: "questions.10.prompt", message: "Add a question" },
      { path: "title", message: "Add a title" },
    ];

    expect(issuesForQuestion(issues, 1).map((issue) => issue.path)).toEqual([
      "questions.1.prompt",
    ]);
  });
});
