import { createContext, useContext } from "react";
import type { FormEditorDto } from "@shared/contracts/forms";
import type { DraftValidationIssue } from "../draft/form-draft";
import type { QuestionArrayApi } from "./use-question-array";

export type FormDraftContextValue = {
  formId: string;
  savedForm: FormEditorDto;
  activeQuestionId: string | null;
  setActiveQuestionId: (id: string | null) => void;
  pendingFocusQuestionId: string | null;
  setPendingFocusQuestionId: (id: string | null) => void;
  saveError: string | null;
  saveIssues: DraftValidationIssue[];
  isSaving: boolean;
  save: () => Promise<boolean>;
} & QuestionArrayApi;

export const FormDraftContext = createContext<FormDraftContextValue | null>(null);

export function useFormDraft(): FormDraftContextValue {
  const value = useContext(FormDraftContext);
  if (!value) {
    throw new Error("useFormDraft must be used within FormDraftProvider");
  }
  return value;
}
