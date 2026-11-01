import { describe, expect, it } from "vitest";
import { QUESTION_TYPES } from "@shared/contracts/questions";
import {
  changeDraftQuestionType,
  createDraftQuestion,
  draftToUpdateRequest,
  duplicateDraftQuestion,
  editorDtoToDraft,
  wouldLoseOptions,
} from "@/features/form-builder/draft/form-draft";

describe("form draft helpers", () => {
  it("creates choice questions with two default options", () => {
    const question = createDraftQuestion("singleSelect");
    expect(question.type).toBe("singleSelect");
    if (question.type !== "singleSelect") {
      throw new Error("expected singleSelect");
    }
    expect(question.options).toHaveLength(2);
  });

  it("preserves options when switching between choice types", () => {
    const question = createDraftQuestion("singleSelect");
    if (question.type !== "singleSelect") {
      throw new Error("expected singleSelect");
    }
    question.options[0].label = "Alpha";
    const next = changeDraftQuestionType(question, "multiSelect");
    expect(next.type).toBe("multiSelect");
    if (next.type !== "multiSelect") {
      throw new Error("expected multiSelect");
    }
    expect(next.options[0].label).toBe("Alpha");
  });

  it("detects option loss when leaving a choice type", () => {
    const question = createDraftQuestion("singleSelect");
    expect(wouldLoseOptions(question, "shortText")).toBe(true);
    expect(wouldLoseOptions(question, "multiSelect")).toBe(false);
  });

  it("saves an empty title and question as untitled defaults", () => {
    const draft = {
      title: "  ",
      description: "",
      questions: [createDraftQuestion("shortText")],
    };
    const result = draftToUpdateRequest(draft, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected success");
    }
    expect(result.request.title).toBe("Untitled form");
    expect(result.request.questions[0].prompt).toBe("Untitled question");
  });

  it("shows a saved untitled form as empty fields", () => {
    const questionId = crypto.randomUUID();
    const draft = editorDtoToDraft({
      id: crypto.randomUUID(),
      revision: 1,
      title: "Untitled form",
      description: "",
      questions: [
        {
          id: questionId,
          type: "shortText",
          prompt: "Untitled question",
          required: false,
        },
      ],
      acceptingResponses: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(draft.title).toBe("");
    expect(draft.questions[0]?.prompt).toBe("");
  });

  it("saves a blank checkbox label as Yes and keeps a custom one", () => {
    const blank = createDraftQuestion("checkbox");
    blank.prompt = "Agreement";
    const blankResult = draftToUpdateRequest(
      { title: "Terms", description: "", questions: [blank] },
      1,
    );
    expect(blankResult.ok).toBe(true);
    if (!blankResult.ok || blankResult.request.questions[0].type !== "checkbox") {
      throw new Error("expected a checkbox question");
    }
    expect(blankResult.request.questions[0].label).toBe("Yes");

    const custom = createDraftQuestion("checkbox");
    custom.prompt = "Agreement";
    custom.label = "I agree";
    const customResult = draftToUpdateRequest(
      { title: "Terms", description: "", questions: [custom] },
      1,
    );
    expect(customResult.ok).toBe(true);
    if (!customResult.ok || customResult.request.questions[0].type !== "checkbox") {
      throw new Error("expected a checkbox question");
    }
    expect(customResult.request.questions[0].label).toBe("I agree");
  });

  it("prefixes a duplicated question with Copy of", () => {
    const named = createDraftQuestion("shortText");
    named.prompt = "Favorite color";
    const namedCopy = duplicateDraftQuestion(named);
    expect(namedCopy.id).not.toBe(named.id);
    expect(namedCopy.prompt).toBe("Copy of Favorite color");

    const untitled = createDraftQuestion("shortText");
    expect(duplicateDraftQuestion(untitled).prompt).toBe("Copy of Untitled question");
  });

  it("saves a rating scale between 3 and 10", () => {
    const question = createDraftQuestion("rating");
    question.prompt = "How was it?";
    question.max = 7;
    const result = draftToUpdateRequest(
      { title: "Feedback", description: "", questions: [question] },
      1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.request.questions[0].type !== "rating") {
      throw new Error("expected a rating question");
    }
    expect(result.request.questions[0].max).toBe(7);
  });

  it("rejects a rating scale outside 3 to 10", () => {
    const question = createDraftQuestion("rating");
    question.prompt = "How was it?";
    question.max = 2;
    const result = draftToUpdateRequest(
      { title: "Feedback", description: "", questions: [question] },
      1,
    );
    expect(result.ok).toBe(false);
  });

  it("blocks saving when a number minimum exceeds its maximum", () => {
    const question = createDraftQuestion("number");
    question.prompt = "Age";
    if (question.type !== "number") {
      throw new Error("expected number");
    }
    question.min = 10;
    question.max = 2;
    const result = draftToUpdateRequest(
      { title: "Survey", description: "", questions: [question] },
      1,
    );
    expect(result).toEqual({
      ok: false,
      issues: [{ path: "questions.0.min", message: "Minimum cannot be greater than maximum" }],
    });
  });

  it("reports choice problems with the path of the offending option", () => {
    const question = createDraftQuestion("multiSelect");
    question.prompt = "Pick";
    if (question.type !== "multiSelect") {
      throw new Error("expected multiSelect");
    }
    question.options[0].label = "Only one";
    question.options[1].label = "  ";
    const result = draftToUpdateRequest(
      { title: "Survey", description: "", questions: [question] },
      1,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.issues.map((issue) => issue.path)).toEqual([
      "questions.0.options",
      "questions.0.options.1.label",
    ]);
  });

  it("reports duplicated question ids", () => {
    const question = createDraftQuestion("shortText");
    question.prompt = "Name";
    const result = draftToUpdateRequest(
      { title: "Survey", description: "", questions: [question, { ...question }] },
      1,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.issues[0]?.path).toBe("questions.1.id");
  });

  it("keeps number bounds and checkbox labels only for the type that owns them", () => {
    const number = createDraftQuestion("number");
    if (number.type !== "number") {
      throw new Error("expected number");
    }
    number.min = 1;
    number.max = 9;

    const roundTrip = changeDraftQuestionType(number, "number");
    expect(roundTrip).toMatchObject({ type: "number", min: 1, max: 9 });

    const fromText = changeDraftQuestionType(createDraftQuestion("shortText"), "number");
    expect(fromText).toMatchObject({ type: "number", min: undefined, max: undefined });

    const checkbox = createDraftQuestion("checkbox");
    if (checkbox.type !== "checkbox") {
      throw new Error("expected checkbox");
    }
    checkbox.label = "I agree";
    expect(changeDraftQuestionType(checkbox, "checkbox")).toMatchObject({ label: "I agree" });
    expect(changeDraftQuestionType(checkbox, "rating")).toMatchObject({ type: "rating", max: 5 });
  });

  it("keeps id, prompt, description and required when the type changes", () => {
    const question = createDraftQuestion("shortText");
    question.prompt = "Why?";
    question.description = "Be honest";
    question.required = true;

    const next = changeDraftQuestionType(question, "singleSelect");
    expect(next).toMatchObject({
      id: question.id,
      prompt: "Why?",
      description: "Be honest",
      required: true,
      type: "singleSelect",
    });
  });

  it("gives duplicated choice options fresh ids", () => {
    const question = createDraftQuestion("singleSelect");
    if (question.type !== "singleSelect") {
      throw new Error("expected singleSelect");
    }
    const copy = duplicateDraftQuestion(question);
    if (copy.type !== "singleSelect") {
      throw new Error("expected singleSelect");
    }
    const originalIds = new Set(question.options.map((option) => option.id));
    expect(copy.options.every((option) => !originalIds.has(option.id))).toBe(true);
    expect(copy.options.map((option) => option.label)).toEqual(
      question.options.map((option) => option.label),
    );
  });

  it.each(QUESTION_TYPES)("creates a savable %s question once it has a prompt", (type) => {
    const question = createDraftQuestion(type);
    question.prompt = "A question";
    expect(question.type).toBe(type);

    const result = draftToUpdateRequest(
      { title: "Survey", description: "", questions: [question] },
      1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected success");
    }
    expect(result.request.questions[0]?.type).toBe(type);
  });

  it.each(QUESTION_TYPES)("can switch an existing question to %s", (type) => {
    const source = createDraftQuestion("singleSelect");
    source.prompt = "Pick one";
    const next = changeDraftQuestionType(source, type);
    expect(next.type).toBe(type);
    expect(next.id).toBe(source.id);
  });

  it("produces a valid update request for complete drafts", () => {
    const question = createDraftQuestion("rating");
    question.prompt = "How was it?";
    const draft = {
      title: "Feedback",
      description: "Tell us more",
      questions: [question],
    };
    const result = draftToUpdateRequest(draft, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected success");
    }
    expect(result.request.expectedRevision).toBe(2);
    expect(result.request.questions[0].type).toBe("rating");
  });
});
