import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { getErrorMessage, isApiClientError } from "@/api/api-error";
import { usePublicFormQuery } from "@/features/forms/hooks/use-public-form-query";
import { useSubmitFormMutation } from "@/features/forms/hooks/use-submit-form-mutation";
import { Button } from "@/shared/ui/Button";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingState } from "@/shared/ui/LoadingState";
import {
  buildAnswersFromValues,
  createEmptyAnswerValues,
  type AnswerFormValues,
} from "../utils/answer-values";
import { FormRenderer } from "./FormRenderer";
import styles from "./FormFillPage.module.css";
import formRendererStyles from "./FormRenderer.module.css";

export function FormFillPage() {
  const params = useParams();
  const formId = params.formId;

  if (!formId) {
    return (
      <ErrorState
        title="Form not found"
        description="We couldn’t find this form. It may have been removed."
      />
    );
  }

  return <FormFillPageInner formId={formId} />;
}

function FormFillPageInner({ formId }: { formId: string }) {
  const formQuery = usePublicFormQuery(formId);
  const submitMutation = useSubmitFormMutation(formId);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [initializedFormId, setInitializedFormId] = useState<string | null>(null);
  const pendingSubmit = useRef<{ fingerprint: string; idempotencyKey: string } | null>(
    null,
  );

  const methods = useForm<AnswerFormValues>({
    defaultValues: {},
  });

  useEffect(() => {
    if (!formQuery.data || initializedFormId === formQuery.data.id) {
      return;
    }
    methods.reset(createEmptyAnswerValues(formQuery.data.questions));
    setInitializedFormId(formQuery.data.id);
  }, [formQuery.data, initializedFormId, methods]);

  if (formQuery.isPending) {
    return <LoadingState label="Loading form" />;
  }

  if (formQuery.isError || !formQuery.data) {
    return (
      <ErrorState
        title="Form unavailable"
        description={getErrorMessage(
          formQuery.error,
          "This form isn’t available right now. It may have been removed.",
        )}
        action={
          <Button variant="secondary" onClick={() => void formQuery.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (submittedAt) {
    return (
      <div className={styles.success} role="status">
        <h1 className={styles.successTitle}>Thanks — your response was recorded</h1>
        <p className={styles.successBody}>
          Submitted{" "}
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(submittedAt))}
          .
        </p>
      </div>
    );
  }

  const form = formQuery.data;

  async function handleSubmit() {
    if (!form.acceptingResponses) {
      return;
    }
    setSubmitError(null);
    const values = methods.getValues();
    const built = buildAnswersFromValues(form.questions, values);
    if (!built.ok) {
      for (const [questionId, message] of Object.entries(built.fieldErrors)) {
        methods.setError(questionId, { type: "validate", message });
      }
      const firstErrorId = Object.keys(built.fieldErrors)[0];
      if (firstErrorId) {
        const node = document.getElementById(firstErrorId);
        node?.focus();
      }
      return;
    }

    methods.clearErrors();

    const body = {
      formRevision: form.revision,
      answers: built.answers,
    };
    const fingerprint = JSON.stringify(body);
    const idempotencyKey =
      pendingSubmit.current?.fingerprint === fingerprint
        ? pendingSubmit.current.idempotencyKey
        : crypto.randomUUID();
    pendingSubmit.current = { fingerprint, idempotencyKey };

    try {
      const receipt = await submitMutation.mutateAsync({
        ...body,
        idempotencyKey,
      });
      setSubmittedAt(receipt.submittedAt);
    } catch (error) {
      if (
        isApiClientError(error) &&
        error.body.code === "CONFLICT" &&
        error.body.currentRevision !== undefined
      ) {
        setSubmitError(
          "This form was updated while you were filling it out. Refresh the page and try again.",
        );
      } else {
        setSubmitError(
          getErrorMessage(error, "We couldn’t submit your response. Please try again."),
        );
      }
    }
  }

  return (
    <FormProvider {...methods}>
      <FormRenderer
        title={form.title}
        description={form.description}
        questions={form.questions}
        disabled={!form.acceptingResponses}
        onSubmit={() => void handleSubmit()}
        footer={
          form.acceptingResponses ? (
          <>
            <Button type="submit" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting…" : "Submit"}
            </Button>
            {submitError ? (
              <p className={formRendererStyles.submitError} role="alert">
                {submitError}
              </p>
            ) : null}
          </>
          ) : (
            <p className={styles.closed} role="status">
              This form is no longer accepting responses.
            </p>
          )
        }
      />
    </FormProvider>
  );
}
