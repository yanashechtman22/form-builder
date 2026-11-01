import { useCallback, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { getErrorMessage, isApiClientError } from "@/api/api-error";
import type { FormEditorDto } from "@shared/contracts/forms";
import { useUpdateFormMutation } from "@/features/forms/hooks/use-update-form-mutation";
import {
  draftToUpdateRequest,
  type DraftValidationIssue,
  type FormDraft,
} from "../draft/form-draft";
import { questionIndexFromIssuePath } from "../draft/save-issues";

/** The last save problem, cleared as soon as the user edits anything. */
export function useSaveFeedback() {
  const { watch } = useFormContext<FormDraft>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveIssues, setSaveIssues] = useState<DraftValidationIssue[]>([]);

  const clear = useCallback(() => {
    setSaveIssues((current) => (current.length === 0 ? current : []));
    setSaveError((current) => (current === null ? current : null));
  }, []);

  const fail = useCallback((message: string, issues: DraftValidationIssue[] = []) => {
    setSaveIssues(issues);
    setSaveError(message);
  }, []);

  useEffect(() => {
    const subscription = watch(clear);
    return () => subscription.unsubscribe();
  }, [watch, clear]);

  return { saveError, saveIssues, clear, fail };
}

export type SaveFeedback = ReturnType<typeof useSaveFeedback>;

type UseSaveDraftOptions = {
  formId: string;
  /** `null` until the saved form has been loaded into the draft. */
  revision: number | null;
  adoptSaved: (saved: FormEditorDto) => void;
  feedback: Pick<SaveFeedback, "clear" | "fail">;
  /** Called with the first question that failed validation, so the UI can reveal it. */
  onInvalidQuestion: (questionId: string) => void;
};

function describeSaveError(error: unknown): string {
  if (isApiClientError(error) && error.body.code === "CONFLICT") {
    return "Someone else saved changes to this form. Refresh to load the latest version, then try again.";
  }
  return getErrorMessage(error, "We couldn’t save your form. Please try again.");
}

export function useSaveDraft({
  formId,
  revision,
  adoptSaved,
  feedback,
  onInvalidQuestion,
}: UseSaveDraftOptions) {
  const { getValues } = useFormContext<FormDraft>();
  const { mutateAsync, isPending } = useUpdateFormMutation(formId);
  const { clear, fail } = feedback;

  const save = useCallback(async (): Promise<boolean> => {
    if (revision === null) {
      return false;
    }

    const draft = getValues();
    const prepared = draftToUpdateRequest(draft, revision);
    if (!prepared.ok) {
      const index = questionIndexFromIssuePath(prepared.issues[0]?.path ?? "");
      const questionId = index === null ? undefined : draft.questions[index]?.id;
      if (questionId) {
        onInvalidQuestion(questionId);
      }
      fail(
        prepared.issues[0]?.message ?? "Please fix the issues below before saving.",
        prepared.issues,
      );
      return false;
    }

    try {
      adoptSaved(await mutateAsync(prepared.request));
      clear();
      return true;
    } catch (error) {
      fail(describeSaveError(error));
      return false;
    }
  }, [adoptSaved, clear, fail, getValues, mutateAsync, onInvalidQuestion, revision]);

  return { save, isSaving: isPending };
}
