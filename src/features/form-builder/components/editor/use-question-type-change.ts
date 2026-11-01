import { useState } from "react";
import { useFormContext } from "react-hook-form";
import type { QuestionType } from "@shared/contracts/questions";
import {
  changeDraftQuestionType,
  wouldLoseOptions,
  type FormDraft,
} from "../../draft/form-draft";

/**
 * Changes a question's type, asking first when that would throw away options
 * the author has already typed.
 */
export function useQuestionTypeChange(questionIndex: number) {
  const { getValues, setValue } = useFormContext<FormDraft>();
  const questionName = `questions.${questionIndex}` as const;
  const [pendingType, setPendingType] = useState<QuestionType | null>(null);

  function apply(nextType: QuestionType) {
    const current = getValues(questionName);
    setValue(questionName, changeDraftQuestionType(current, nextType), { shouldDirty: true });
  }

  function request(nextType: QuestionType) {
    if (wouldLoseOptions(getValues(questionName), nextType)) {
      setPendingType(nextType);
      return;
    }
    apply(nextType);
  }

  function confirm() {
    if (pendingType) {
      apply(pendingType);
    }
    setPendingType(null);
  }

  function cancel() {
    setPendingType(null);
  }

  return { pendingType, request, confirm, cancel };
}
