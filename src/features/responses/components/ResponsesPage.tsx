import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useParams } from "react-router-dom";
import type { SubmissionDto } from "@shared/contracts/submissions";
import { getErrorMessage } from "@/api/api-error";
import { useSubmissionsQuery } from "@/features/forms/hooks/use-submissions-query";
import {
  formatAbsoluteDateTime,
  formatRelativeTime,
} from "@/shared/lib/format-time";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState";
import { LoadingState } from "@/shared/ui/LoadingState";
import { formatAnswerValue } from "../utils/format-answer";
import { summarizeSubmissions } from "../utils/response-summaries";
import styles from "./ResponsesPage.module.css";

function previewForSubmission(submission: SubmissionDto): string {
  const firstQuestion = submission.formSnapshot.questions[0];
  if (!firstQuestion) {
    return "No answers";
  }
  const answer = submission.answers.find(
    (item) => item.questionId === firstQuestion.id,
  );
  return formatAnswerValue(firstQuestion, answer);
}

export function ResponsesPage() {
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

  return <ResponsesPageInner formId={formId} />;
}

function ResponsesPageInner({ formId }: { formId: string }) {
  const submissionsQuery = useSubmissionsQuery(formId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const submissions = useMemo(
    () => submissionsQuery.data?.items ?? [],
    [submissionsQuery.data?.items],
  );
  const selectedIndex = Math.max(
    0,
    submissions.findIndex((submission) => submission.id === selectedId),
  );
  const selected =
    submissions.find((submission) => submission.id === selectedId) ??
    submissions[0] ??
    null;

  const summaries = useMemo(() => summarizeSubmissions(submissions), [submissions]);

  useEffect(() => {
    if (!selected && submissions[0]) {
      setSelectedId(submissions[0].id);
    }
  }, [selected, submissions]);

  useEffect(() => {
    if (submissions.length === 0) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        const next = submissions[Math.min(selectedIndex + 1, submissions.length - 1)];
        if (next) {
          setSelectedId(next.id);
        }
      }
      if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        const prev = submissions[Math.max(selectedIndex - 1, 0)];
        if (prev) {
          setSelectedId(prev.id);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, submissions]);

  if (submissionsQuery.isPending) {
    return <LoadingState label="Loading responses" />;
  }

  if (submissionsQuery.isError) {
    return (
      <ErrorState
        title="Couldn’t load responses"
        description={getErrorMessage(
          submissionsQuery.error,
          "We couldn’t load responses for this form. Please try again.",
        )}
        action={
          <Button variant="secondary" onClick={() => void submissionsQuery.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const latest = submissions[0];

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <p className={styles.toolbarMeta}>
          {submissions.length} response{submissions.length === 1 ? "" : "s"}
          {latest ? ` · Latest ${formatRelativeTime(latest.submittedAt)}` : ""}
        </p>
        <Button variant="ghost" size="sm" onClick={() => void submissionsQuery.refetch()}>
          Refresh
        </Button>
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          title="No responses yet"
          description="Share the fill link. Once someone submits, their answers will show up here."
          action={
            <Button
              variant="secondary"
              onClick={() => window.open(`/f/${formId}`, "_blank", "noopener,noreferrer")}
            >
              Open fill link
            </Button>
          }
        />
      ) : (
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.panel}>
              <div className={styles.list} role="listbox" aria-label="Submissions">
                {submissions.map((submission, index) => {
                  const isActive = selected?.id === submission.id;
                  const preview = previewForSubmission(submission);
                  return (
                    <button
                      key={submission.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={clsx(styles.item, isActive && styles.itemActive)}
                      onClick={() => setSelectedId(submission.id)}
                    >
                      <span className={styles.itemIndex}>
                        {submissions.length - index}
                      </span>
                      <span className={styles.itemCopy}>
                        <span className={styles.itemTitle}>
                          Response {submissions.length - index}
                        </span>
                        <span className={styles.itemMeta}>
                          {formatRelativeTime(submission.submittedAt)}
                        </span>
                        <span className={styles.itemPreview}>{preview}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {summaries.length > 0 ? (
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <p className={styles.panelTitle}>Overview</p>
                </div>
                <div className={styles.summaryList}>
                  {summaries.map((block) => {
                    const max = Math.max(...block.rows.map((row) => row.count), 1);
                    return (
                      <div key={block.questionId} className={styles.summaryBlock}>
                        <p className={styles.summaryPrompt}>{block.prompt}</p>
                        {block.rows.map((row) => (
                          <div key={row.key} className={styles.summaryRow}>
                            <div>
                              <div className={styles.optionLabel}>{row.label}</div>
                              <div className={styles.barTrack}>
                                <div
                                  className={styles.barFill}
                                  style={{ width: `${(row.count / max) * 100}%` }}
                                />
                              </div>
                            </div>
                            <div className={styles.count}>{row.count}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </aside>

          <section className={styles.detail} aria-live="polite">
            {selected ? (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <h2 className={styles.detailTitle}>
                      Response{" "}
                      {submissions.length -
                        submissions.findIndex((item) => item.id === selected.id)}
                    </h2>
                    <p className={styles.detailMeta}>
                      {formatAbsoluteDateTime(selected.submittedAt)}
                    </p>
                  </div>
                </div>
                <div className={styles.answers}>
                  {selected.formSnapshot.questions.map((question) => {
                    const answer = selected.answers.find(
                      (item) => item.questionId === question.id,
                    );
                    const value = formatAnswerValue(question, answer);
                    const isEmpty = value === "No response";
                    return (
                      <div key={question.id} className={styles.answerBlock}>
                        <p className={styles.prompt}>{question.prompt}</p>
                        <p
                          className={clsx(styles.value, isEmpty && styles.emptyValue)}
                        >
                          {value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
