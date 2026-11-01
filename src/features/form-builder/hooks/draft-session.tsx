import { useMemo, type ReactNode } from "react";
import type { FormEditorDto } from "@shared/contracts/forms";
import type { DraftValidationIssue } from "../draft/form-draft";
import { FormDraftProvider } from "./FormDraftProvider";
import type { FormDraftContextValue } from "./form-draft-context";
import { useQuestionArray } from "./use-question-array";

type DraftSessionProps = {
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
  children: ReactNode;
};

export function DraftSession({
  formId,
  savedForm,
  activeQuestionId,
  setActiveQuestionId,
  pendingFocusQuestionId,
  setPendingFocusQuestionId,
  saveError,
  saveIssues,
  isSaving,
  save,
  children,
}: DraftSessionProps) {
  const questionArray = useQuestionArray({
    activeQuestionId,
    setActiveQuestionId,
    setPendingFocusQuestionId,
  });

  const value = useMemo<FormDraftContextValue>(
    () => ({
      formId,
      savedForm,
      activeQuestionId,
      setActiveQuestionId,
      pendingFocusQuestionId,
      setPendingFocusQuestionId,
      saveError,
      saveIssues,
      isSaving,
      save,
      ...questionArray,
    }),
    [
      activeQuestionId,
      formId,
      isSaving,
      pendingFocusQuestionId,
      questionArray,
      save,
      saveError,
      saveIssues,
      savedForm,
      setActiveQuestionId,
      setPendingFocusQuestionId,
    ],
  );

  return <FormDraftProvider value={value}>{children}</FormDraftProvider>;
}
