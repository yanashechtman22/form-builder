import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import type { QuestionType } from "@shared/contracts/questions";
import {
  createDraftQuestion,
  duplicateDraftQuestion,
  type FormDraft,
} from "../draft/form-draft";

type UseQuestionArrayOptions = {
  activeQuestionId: string | null;
  setActiveQuestionId: (id: string | null) => void;
  setPendingFocusQuestionId: (id: string | null) => void;
};

export function useQuestionArray({
  activeQuestionId,
  setActiveQuestionId,
  setPendingFocusQuestionId,
}: UseQuestionArrayOptions) {
  const { control, getValues } = useFormContext<FormDraft>();
  const { fields, insert, remove, move } = useFieldArray({
    control,
    name: "questions",
    keyName: "fieldKey",
  });

  const insertQuestion = useCallback(
    (type: QuestionType = "shortText", afterIndex?: number) => {
      const question = createDraftQuestion(type);
      const questions = getValues("questions");
      const activeIndex = questions.findIndex((item) => item.id === activeQuestionId);
      const insertAt =
        afterIndex !== undefined
          ? afterIndex + 1
          : activeIndex >= 0
            ? activeIndex + 1
            : questions.length;
      insert(insertAt, question, { shouldFocus: false });
      setActiveQuestionId(question.id);
      setPendingFocusQuestionId(question.id);
      return question.id;
    },
    [activeQuestionId, getValues, insert, setActiveQuestionId, setPendingFocusQuestionId],
  );

  const duplicateQuestion = useCallback(
    (index: number) => {
      const current = getValues(`questions.${index}`);
      const duplicated = duplicateDraftQuestion(current);
      insert(index + 1, duplicated, { shouldFocus: false });
      setActiveQuestionId(duplicated.id);
      setPendingFocusQuestionId(duplicated.id);
    },
    [getValues, insert, setActiveQuestionId, setPendingFocusQuestionId],
  );

  const removeQuestion = useCallback(
    (index: number) => {
      const questions = getValues("questions");
      const nextActive = questions[index + 1]?.id ?? questions[index - 1]?.id ?? null;
      remove(index);
      setActiveQuestionId(nextActive);
    },
    [getValues, remove, setActiveQuestionId],
  );

  const moveQuestion = useCallback(
    (from: number, to: number) => {
      move(from, to);
    },
    [move],
  );

  return useMemo(
    () => ({
      fields,
      insertQuestion,
      duplicateQuestion,
      removeQuestion,
      moveQuestion,
    }),
    [duplicateQuestion, fields, insertQuestion, moveQuestion, removeQuestion],
  );
}

export type QuestionArrayApi = ReturnType<typeof useQuestionArray>;
