import type { QuestionType } from "@shared/contracts/questions";

/**
 * Draft shapes are deliberately looser than the API contracts: while editing,
 * prompts may be blank and option lists short. `draftToUpdateRequest` is the
 * only gate that turns a draft into a strict, validated request.
 */

export type DraftOption = {
  id: string;
  label: string;
};

export type DraftQuestionBase = {
  id: string;
  prompt: string;
  description?: string;
  required: boolean;
};

export type DraftQuestion =
  | (DraftQuestionBase & { type: "shortText" })
  | (DraftQuestionBase & { type: "longText" })
  | (DraftQuestionBase & { type: "number"; min?: number; max?: number })
  | (DraftQuestionBase & { type: "date" })
  | (DraftQuestionBase & { type: "singleSelect"; options: DraftOption[] })
  | (DraftQuestionBase & { type: "multiSelect"; options: DraftOption[] })
  | (DraftQuestionBase & { type: "checkbox"; label: string })
  | (DraftQuestionBase & { type: "rating"; max: number });

export type DraftOf<T extends QuestionType> = Extract<DraftQuestion, { type: T }>;

export type FormDraft = {
  title: string;
  description?: string;
  questions: DraftQuestion[];
};

export type DraftValidationIssue = {
  path: string;
  message: string;
};
