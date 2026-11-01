import { useState } from "react";
import clsx from "clsx";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { getErrorMessage } from "@/api/api-error";
import { useDeleteFormMutation } from "@/features/forms/hooks/use-delete-form-mutation";
import { useSetAcceptanceMutation } from "@/features/forms/hooks/use-set-acceptance-mutation";
import { ShareFormPopover } from "@/features/forms/components/ShareFormPopover";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { ArrowLeftIcon } from "@/shared/ui/Icons";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { FormDraft } from "../../draft/form-draft";
import { useFormDraft } from "../../hooks/form-draft-context";
import styles from "./BuilderHeader.module.css";

function tabClassName({ isActive }: { isActive: boolean }): string {
  return clsx(styles.tab, isActive && styles.tabActive);
}

export function BuilderHeader() {
  const navigate = useNavigate();
  const { formId, savedForm, save, isSaving, saveError } = useFormDraft();
  const deleteForm = useDeleteFormMutation();
  const setAcceptance = useSetAcceptanceMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { control } = useFormContext<FormDraft>();
  // useFormState subscribes only this component. Reading `formState` off the
  // form context would re-render the form's host (and every field) instead.
  const { isDirty } = useFormState({ control });
  const title = useWatch({ control, name: "title" });
  const displayTitle = title?.trim() ? title.trim() : "Untitled form";

  return (
    <div className={styles.header}>
      <div className={styles.crumbRow}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeftIcon size={14} />
          All forms
        </Link>
        <span className={styles.crumbSep} aria-hidden="true">
          /
        </span>
        <Tooltip label={displayTitle}>
          <span className={styles.crumbTitle}>{displayTitle}</span>
        </Tooltip>
        <span className={clsx(styles.status, isDirty && styles.statusDirty)} role="status">
          {isSaving ? "Saving…" : isDirty ? "Unsaved" : "Saved"}
        </span>
        {savedForm.acceptingResponses ? null : (
          <span className={styles.statusClosed}>Closed</span>
        )}
      </div>

      <div className={styles.topRow}>
        <nav className={styles.tabs} aria-label="Form views">
          <NavLink to={`/forms/${formId}/edit`} className={tabClassName} end>
            Edit
          </NavLink>
          <NavLink to={`/forms/${formId}/preview`} className={tabClassName}>
            Preview
          </NavLink>
          <NavLink to={`/forms/${formId}/responses`} className={tabClassName}>
            Responses
          </NavLink>
        </nav>

        <div className={styles.actions}>
          <ShareFormPopover
            formId={formId}
            hasUnsavedChanges={isDirty}
            acceptingResponses={savedForm.acceptingResponses}
          >
            <Button variant="ghost" size="sm">
              Share
            </Button>
          </ShareFormPopover>
          <Button
            variant="ghost"
            size="sm"
            disabled={setAcceptance.isPending}
            onClick={() => {
              setActionError(null);
              setAcceptance.mutate(
                {
                  formId,
                  acceptingResponses: !savedForm.acceptingResponses,
                },
                {
                  onError: (error) => {
                    setActionError(
                      getErrorMessage(
                        error,
                        "We couldn’t update responses for this form. Please try again.",
                      ),
                    );
                  },
                },
              );
            }}
          >
            {savedForm.acceptingResponses ? "Stop responses" : "Accept responses"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={deleteForm.isPending}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={!isDirty || isSaving}>
            Save
          </Button>
        </div>
      </div>
      {saveError ? (
        <p className={styles.error} role="alert">
          {saveError}
        </p>
      ) : null}
      {actionError ? (
        <p className={styles.error} role="alert">
          {actionError}
        </p>
      ) : null}
      <Dialog
        open={confirmDelete}
        title="Delete this form?"
        description="This deletes the form and its responses. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (deleteForm.isPending) {
            return;
          }
          setActionError(null);
          deleteForm.mutate(formId, {
            onSuccess: async () => {
              setConfirmDelete(false);
              // Leave first: clearing the cache while this page is still open
              // would make it refetch the deleted form and show an error.
              await navigate("/");
              deleteForm.forget(formId);
            },
            onError: (error) => {
              setConfirmDelete(false);
              setActionError(
                getErrorMessage(error, "We couldn’t delete this form. Please try again."),
              );
            },
          });
        }}
      />
    </div>
  );
}
