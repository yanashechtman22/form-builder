import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GENERATE_FORM_PROMPT_MAX } from "@shared/contracts/limits";
import { getErrorMessage } from "@/api/api-error";
import { formatAbsoluteDateTime, formatRelativeTime } from "@/shared/lib/format-time";
import { Button } from "@/shared/ui/Button";
import { Dialog } from "@/shared/ui/Dialog";
import { KebabIcon } from "@/shared/ui/Icons";
import { Menu } from "@/shared/ui/Menu";
import { Tooltip } from "@/shared/ui/Tooltip";
import { CharacterCount } from "@/shared/ui/CharacterCount";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { Label } from "@/shared/ui/Label";
import { LoadingState } from "@/shared/ui/LoadingState";
import { Textarea } from "@/shared/ui/Textarea";
import { useCreateFormMutation } from "../hooks/use-create-form-mutation";
import { useDeleteFormMutation } from "../hooks/use-delete-form-mutation";
import { useFormsQuery } from "../hooks/use-forms-query";
import { useGenerateFormMutation } from "../hooks/use-generate-form-mutation";
import { useSetAcceptanceMutation } from "../hooks/use-set-acceptance-mutation";
import { GenerateProgress } from "./GenerateProgress";
import { ShareFormPopover } from "./ShareFormPopover";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const navigate = useNavigate();
  const formsQuery = useFormsQuery();
  const createFormMutation = useCreateFormMutation();
  const generateFormMutation = useGenerateFormMutation();
  const deleteForm = useDeleteFormMutation();
  const setAcceptance = useSetAcceptanceMutation();
  const [prompt, setPrompt] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ title: string; description: string } | null>(
    null,
  );

  async function handleGenerate() {
    const description = prompt.trim();
    if (!description) {
      return;
    }
    try {
      const form = await generateFormMutation.mutateAsync(description);
      navigate(`/forms/${form.id}/edit`);
    } catch {
      // Mutation error state is rendered below.
    }
  }

  async function handleCreate() {
    try {
      const form = await createFormMutation.mutateAsync();
      navigate(`/forms/${form.id}/edit`);
    } catch {
      // Mutation error state is rendered below.
    }
  }

  if (formsQuery.isPending) {
    return <LoadingState label="Loading forms" rows={2} />;
  }

  if (formsQuery.isError) {
    return (
      <ErrorState
        title="Couldn’t load forms"
        description={getErrorMessage(
          formsQuery.error,
          "We couldn’t load your forms. Please try again.",
        )}
        action={
          <Button variant="secondary" onClick={() => void formsQuery.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const forms = formsQuery.data.items;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Forms</h1>
          <p className="page-subtitle">
            Create a form, share a fill link, and review responses.
          </p>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => void handleCreate()} disabled={createFormMutation.isPending}>
            {createFormMutation.isPending ? "Creating…" : "New form"}
          </Button>
        </div>
      </div>

      <form
        className={`${styles.generate} ${generateFormMutation.isPending ? styles.generateActive : ""}`}
        aria-busy={generateFormMutation.isPending}
        onSubmit={(event) => {
          event.preventDefault();
          void handleGenerate();
        }}
      >
        <div>
          <Label htmlFor="generate-prompt">Describe a form</Label>
          <p className={styles.generateHint}>
            We’ll draft the questions for you. You can edit them before sharing.
          </p>
        </div>
        <Textarea
          id="generate-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="A volunteer signup with name, shirt size, and dietary notes"
          rows={3}
          maxLength={GENERATE_FORM_PROMPT_MAX}
          disabled={generateFormMutation.isPending}
        />
        <CharacterCount value={prompt} max={GENERATE_FORM_PROMPT_MAX} />
        {generateFormMutation.isPending ? <GenerateProgress /> : null}
        <div className={styles.generateActions}>
          <Button
            type="submit"
            disabled={!prompt.trim() || generateFormMutation.isPending}
          >
            {generateFormMutation.isPending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </form>

      {generateFormMutation.isError ? (
        <ErrorState
          title="Couldn’t generate form"
          description={getErrorMessage(
            generateFormMutation.error,
            "That description couldn’t be turned into a form. Try saying it another way.",
          )}
        />
      ) : null}

      {actionError ? (
        <ErrorState title={actionError.title} description={actionError.description} />
      ) : null}

      {createFormMutation.isError ? (
        <ErrorState
          title="Couldn’t create form"
          description={getErrorMessage(
            createFormMutation.error,
            "We couldn’t create a new form. Please try again.",
          )}
        />
      ) : null}

      {forms.length === 0 ? (
        <EmptyState
          title="No forms yet"
          description="Create a form, add questions, then share the fill link."
          action={
            <Button onClick={() => void handleCreate()} disabled={createFormMutation.isPending}>
              New form
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {forms.map((form) => (
            <article key={form.id} className={styles.card}>
              <Link className={styles.cardBody} to={`/forms/${form.id}/edit`}>
                <h2 className={styles.title}>{form.title || "Untitled form"}</h2>
                <div className={styles.meta}>
                  <span className={styles.pill}>
                    {form.questionCount} question{form.questionCount === 1 ? "" : "s"}
                  </span>
                  <span className={styles.pill}>
                    {form.submissionCount} response
                    {form.submissionCount === 1 ? "" : "s"}
                  </span>
                  {form.acceptingResponses ? null : (
                    <span className={styles.pillClosed}>Closed</span>
                  )}
                </div>
              </Link>

              <div className={styles.footer}>
                <Tooltip label={formatAbsoluteDateTime(form.updatedAt)}>
                  <span className={styles.updated}>
                    Updated {formatRelativeTime(form.updatedAt)}
                  </span>
                </Tooltip>
                <div className={styles.quickActions}>
                  <Link className={styles.quickAction} to={`/forms/${form.id}/responses`}>
                    Responses
                  </Link>
                  <ShareFormPopover
                    formId={form.id}
                    acceptingResponses={form.acceptingResponses}
                  >
                    <button type="button" className={styles.quickAction}>
                      Share
                    </button>
                  </ShareFormPopover>
                  <Menu width={200} position="bottom-end">
                    <Menu.Target>
                      <button type="button" className={styles.kebab} aria-label="More actions">
                        <KebabIcon size={16} />
                      </button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        onClick={() => {
                          setActionError(null);
                          setAcceptance.mutate(
                            {
                              formId: form.id,
                              acceptingResponses: !form.acceptingResponses,
                            },
                            {
                              onError: (error) => {
                                setActionError({
                                  title: "Couldn’t update responses",
                                  description: getErrorMessage(
                                    error,
                                    "We couldn’t update responses for this form. Please try again.",
                                  ),
                                });
                              },
                            },
                          );
                        }}
                      >
                        {form.acceptingResponses ? "Stop responses" : "Accept responses"}
                      </Menu.Item>
                      <Menu.Item color="danger" onClick={() => setPendingDeleteId(form.id)}>
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Dialog
        open={pendingDeleteId !== null}
        title="Delete this form?"
        description="This deletes the form and its responses. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId || deleteForm.isPending) {
            return;
          }
          const formId = pendingDeleteId;
          setActionError(null);
          deleteForm.mutate(formId, {
            onSuccess: () => {
              deleteForm.forget(formId);
              setPendingDeleteId(null);
            },
            onError: (error) => {
              setPendingDeleteId(null);
              setActionError({
                title: "Couldn’t delete form",
                description: getErrorMessage(
                  error,
                  "We couldn’t delete this form. Please try again.",
                ),
              });
            },
          });
        }}
      />
    </div>
  );
}
