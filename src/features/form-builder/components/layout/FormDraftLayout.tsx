import { useCallback, useState } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import type { FormEditorDto } from "@shared/contracts/forms";
import { getErrorMessage } from "@/api/api-error";
import { useFormQuery } from "@/features/forms/hooks/use-form-query";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingState } from "@/shared/ui/LoadingState";
import type { FormDraft } from "../../draft/form-draft";
import { DraftSession } from "../../hooks/draft-session";
import { useBlockUnsavedChanges } from "../../hooks/use-block-unsaved-changes";
import { useDraftHydration } from "../../hooks/use-draft-hydration";
import { useRevealQuestion } from "../../hooks/use-reveal-question";
import { useSaveDraft, useSaveFeedback } from "../../hooks/use-save-draft";
import { useSaveShortcut } from "../../hooks/use-save-shortcut";
import { BuilderHeader } from "./BuilderHeader";
import { RegisterDraftCommands } from "./RegisterDraftCommands";
import styles from "./FormDraftLayout.module.css";

const EMPTY_DRAFT: FormDraft = { title: "", description: "", questions: [] };

/** Edit, preview and responses share one draft, so moving between them is not "leaving". */
function staysWithForm(pathname: string, formId: string): boolean {
  return (
    pathname === `/forms/${formId}` ||
    pathname === `/forms/${formId}/edit` ||
    pathname === `/forms/${formId}/preview` ||
    pathname === `/forms/${formId}/responses`
  );
}

export function FormDraftLayout() {
  const { formId } = useParams();

  if (!formId) {
    return (
      <ErrorState
        title="Form not found"
        description="We couldn’t find this form. It may have been removed."
      />
    );
  }

  return <FormDraftLoader key={formId} formId={formId} />;
}

/**
 * Owns the form instance and the server query. It deliberately reads no form
 * state itself, so typing in the editor never re-renders this level or the
 * form context value that every field consumes.
 */
function FormDraftLoader({ formId }: { formId: string }) {
  const formQuery = useFormQuery(formId);
  const methods = useForm<FormDraft>({ defaultValues: EMPTY_DRAFT, mode: "onChange" });

  // A failed background refetch must not unmount an editor that has unsaved edits.
  if (formQuery.data === undefined) {
    if (formQuery.isError) {
      return (
        <ErrorState
          title="Couldn’t open form"
          description={getErrorMessage(
            formQuery.error,
            "We couldn’t load this form. Please try again.",
          )}
          action={
            <Button variant="secondary" onClick={() => void formQuery.refetch()}>
              Try again
            </Button>
          }
        />
      );
    }
    return <LoadingState label="Loading form editor" />;
  }

  return (
    <FormProvider {...methods}>
      <DraftEditor formId={formId} savedForm={formQuery.data} />
    </FormProvider>
  );
}

type DraftEditorProps = {
  formId: string;
  savedForm: FormEditorDto;
};

function DraftEditor({ formId, savedForm }: DraftEditorProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isDirty } = useFormState<FormDraft>();
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [pendingFocusQuestionId, setPendingFocusQuestionId] = useState<string | null>(null);

  const revealQuestion = useRevealQuestion();
  const feedback = useSaveFeedback();
  const { clear: clearFeedback } = feedback;

  const handleHydrated = useCallback(
    (draft: FormDraft) => {
      clearFeedback();
      setActiveQuestionId((current) =>
        current && draft.questions.some((question) => question.id === current)
          ? current
          : (draft.questions[0]?.id ?? null),
      );
    },
    [clearFeedback],
  );
  const { revision, adoptSaved } = useDraftHydration(savedForm, handleHydrated);

  const handleInvalidQuestion = useCallback(
    (questionId: string) => {
      setActiveQuestionId(questionId);
      revealQuestion(questionId);
      if (!pathname.endsWith("/edit")) {
        navigate(`/forms/${formId}/edit`);
      }
    },
    [formId, navigate, pathname, revealQuestion],
  );

  const { save, isSaving } = useSaveDraft({
    formId,
    revision,
    adoptSaved,
    feedback,
    onInvalidQuestion: handleInvalidQuestion,
  });
  useSaveShortcut(save);

  if (revision === null) {
    return <LoadingState label="Loading form editor" />;
  }

  return (
    <DraftSession
      formId={formId}
      savedForm={savedForm}
      activeQuestionId={activeQuestionId}
      setActiveQuestionId={setActiveQuestionId}
      pendingFocusQuestionId={pendingFocusQuestionId}
      setPendingFocusQuestionId={setPendingFocusQuestionId}
      saveError={feedback.saveError}
      saveIssues={feedback.saveIssues}
      isSaving={isSaving}
      save={save}
    >
      <RegisterDraftCommands />
      <div className={styles.layout}>
        <BuilderHeader />
        <div className={styles.stage}>
          <Outlet />
        </div>
      </div>
      <UnsavedChangesDialog formId={formId} isDirty={isDirty} />
    </DraftSession>
  );
}

function UnsavedChangesDialog({ formId, isDirty }: { formId: string; isDirty: boolean }) {
  const blocker = useBlockUnsavedChanges(
    ({ nextLocation }) => isDirty && !staysWithForm(nextLocation.pathname, formId),
    isDirty,
  );

  return (
    <Dialog
      open={blocker.state === "blocked"}
      title="Discard unsaved changes?"
      description="You have unsaved edits. Leave this page and lose them, or stay and keep editing."
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      tone="danger"
      onConfirm={() => {
        if (blocker.state === "blocked") {
          blocker.proceed();
        }
      }}
      onCancel={() => {
        if (blocker.state === "blocked") {
          blocker.reset();
        }
      }}
    />
  );
}
