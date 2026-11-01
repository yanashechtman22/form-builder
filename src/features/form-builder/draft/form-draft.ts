import {
  FormDefinitionSchema,
  type FormDefinition,
  type FormEditorDto,
  type UpdateFormRequest,
} from "@shared/contracts/forms";
import { QUESTION_PROMPT_MAX } from "@shared/contracts/limits";
import { DEFAULT_CHECKBOX_LABEL, type QuestionType } from "@shared/contracts/questions";
import type {
  DraftQuestion,
  DraftQuestionBase,
  DraftValidationIssue,
  FormDraft,
} from "./draft-types";
import { createId, definitionFor, isChoiceDraft } from "./question-type-definitions";

export type { DraftQuestion, DraftValidationIssue, FormDraft } from "./draft-types";

export const DEFAULT_FORM_TITLE = "Untitled form";
export const DEFAULT_QUESTION_PROMPT = "Untitled question";

const COPY_OF_PREFIX = "Copy of ";

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function baseOf(question: DraftQuestion): DraftQuestionBase {
  return {
    id: question.id,
    prompt: question.prompt,
    description: question.description,
    required: question.required,
  };
}

export function createDraftQuestion(type: QuestionType = "shortText"): DraftQuestion {
  return definitionFor(type).create({
    id: createId(),
    prompt: "",
    description: "",
    required: false,
  });
}

export function editorDtoToDraft(form: FormEditorDto): FormDraft {
  return {
    title: isDefaultFormTitle(form.title) ? "" : form.title,
    description: form.description ?? "",
    questions: form.questions.map((question) => {
      const cloned = structuredClone(question);
      if (isDefaultQuestionPrompt(cloned.prompt)) {
        cloned.prompt = "";
      }
      if (cloned.type === "checkbox" && isDefaultCheckboxLabel(cloned.label)) {
        cloned.label = "";
      }
      return cloned;
    }),
  };
}

function isDefaultFormTitle(title: string): boolean {
  return title.trim() === DEFAULT_FORM_TITLE;
}

function isDefaultQuestionPrompt(prompt: string): boolean {
  return prompt.trim() === DEFAULT_QUESTION_PROMPT;
}

function isDefaultCheckboxLabel(label: string | undefined): boolean {
  return !label?.trim() || label.trim() === DEFAULT_CHECKBOX_LABEL;
}

export function duplicateDraftQuestion(question: DraftQuestion): DraftQuestion {
  const cloned = structuredClone(question);
  cloned.id = createId();
  const source = cloned.prompt.trim() || DEFAULT_QUESTION_PROMPT;
  cloned.prompt = `${COPY_OF_PREFIX}${source}`.slice(0, QUESTION_PROMPT_MAX);
  if (isChoiceDraft(cloned)) {
    cloned.options = cloned.options.map((option) => ({ ...option, id: createId() }));
  }
  return cloned;
}

export function changeDraftQuestionType(
  question: DraftQuestion,
  nextType: QuestionType,
): DraftQuestion {
  const definition = definitionFor(nextType);
  const base = baseOf(question);
  return definition.convertFrom
    ? definition.convertFrom(base, question)
    : definition.create(base);
}

export function wouldLoseOptions(question: DraftQuestion, nextType: QuestionType): boolean {
  if (!isChoiceDraft(question)) {
    return false;
  }
  const nextIsChoice = nextType === "singleSelect" || nextType === "multiSelect";
  if (nextIsChoice) {
    return false;
  }
  return question.options.some((option) => option.label.trim().length > 0);
}

function collectIssues(draft: FormDraft): DraftValidationIssue[] {
  const issues: DraftValidationIssue[] = [];

  if (draft.questions.length === 0) {
    issues.push({ path: "questions", message: "Add at least one question" });
  }

  const questionIds = new Set<string>();
  draft.questions.forEach((question, index) => {
    const path = `questions.${index}`;
    if (questionIds.has(question.id)) {
      issues.push({
        path: `${path}.id`,
        message: "Something went wrong with this question. Remove it and add it again.",
      });
    }
    questionIds.add(question.id);

    const typeIssues = definitionFor(question.type).validate?.(question, path);
    if (typeIssues) {
      issues.push(...typeIssues);
    }
  });

  return issues;
}

function toFormDefinition(draft: FormDraft): FormDefinition {
  return {
    title: draft.title.trim() || DEFAULT_FORM_TITLE,
    description: emptyToUndefined(draft.description),
    questions: draft.questions.map((question) =>
      definitionFor(question.type).toQuestion(question, {
        id: question.id,
        prompt: question.prompt.trim() || DEFAULT_QUESTION_PROMPT,
        description: emptyToUndefined(question.description),
        required: question.required,
      }),
    ),
  };
}

export function draftToUpdateRequest(
  draft: FormDraft,
  expectedRevision: number,
): { ok: true; request: UpdateFormRequest } | { ok: false; issues: DraftValidationIssue[] } {
  const issues = collectIssues(draft);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const parsed = FormDefinitionSchema.safeParse(toFormDefinition(draft));
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return { ok: true, request: { ...parsed.data, expectedRevision } };
}
