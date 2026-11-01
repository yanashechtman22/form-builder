import { memo, useState } from "react";
import type { CSSProperties, HTMLAttributes } from "react";
import clsx from "clsx";
import { useFormContext, useWatch } from "react-hook-form";
import { QUESTION_DESCRIPTION_MAX } from "@shared/contracts/limits";
import { CharacterCount } from "@/shared/ui/CharacterCount";
import { Dialog } from "@/shared/ui/Dialog";
import { IconButton } from "@/shared/ui/IconButton";
import { Textarea } from "@/shared/ui/Textarea";
import { CopyIcon, GripIcon, TrashIcon } from "@/shared/ui/Icons";
import type { DraftValidationIssue, FormDraft } from "../../draft/form-draft";
import { QUESTION_TYPE_META } from "../../draft/question-type-meta";
import { questionCardDomId } from "../../dom-ids";
import { QuestionPromptField } from "./QuestionPromptField";
import { QuestionTypeEditor } from "./question-type-editor";
import { QuestionTypeSelect } from "./QuestionTypeSelect";
import { useQuestionTypeChange } from "./use-question-type-change";
import styles from "./QuestionCard.module.css";

type QuestionCardProps = {
  index: number;
  questionId: string;
  isActive: boolean;
  /** Save problems for this question only. */
  issues: DraftValidationIssue[];
  canDelete: boolean;
  autoFocusPrompt: boolean;
  onAutoFocused: () => void;
  onActivate: (questionId: string) => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  dragAttributes?: HTMLAttributes<HTMLButtonElement>;
  dragListeners?: HTMLAttributes<HTMLButtonElement>;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
};

/**
 * One editable question. It is memoized and subscribes only to the fields it
 * renders itself, so typing in one card does not re-render the others.
 */
export const QuestionCard = memo(function QuestionCard({
  index,
  questionId,
  isActive,
  issues,
  canDelete,
  autoFocusPrompt,
  onAutoFocused,
  onActivate,
  onDuplicate,
  onDelete,
  dragAttributes,
  dragListeners,
  setNodeRef,
  style,
}: QuestionCardProps) {
  const { register, control } = useFormContext<FormDraft>();
  const type = useWatch({ control, name: `questions.${index}.type` });
  const description = useWatch({ control, name: `questions.${index}.description` }) ?? "";
  const typeChange = useQuestionTypeChange(index);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The array can shrink before this card unmounts.
  if (!type) {
    return null;
  }

  const QuietIcon = QUESTION_TYPE_META[type].Icon;
  const showDescription = isActive || description.trim().length > 0;

  return (
    <div id={questionCardDomId(questionId)} ref={setNodeRef} style={style}>
      {/*
        Clicking the card's padding activates it as a pointer convenience.
        Keyboard users activate it by moving focus into it (onFocusCapture),
        so no keyboard path depends on the click handler.
      */}
      <div
        className={clsx(styles.shell, isActive && styles.active)}
        onClick={() => onActivate(questionId)}
        onFocusCapture={() => onActivate(questionId)}
      >
        <div className={styles.body}>
          {isActive ? (
            <div className={styles.metaRow}>
              <QuestionTypeSelect
                id={`question-${questionId}-type`}
                value={type}
                onChange={typeChange.request}
              />
              <div className={styles.actions}>
                <label className={styles.requiredToggle}>
                  <input type="checkbox" {...register(`questions.${index}.required`)} />
                  Required
                </label>
                <IconButton label="Duplicate question" onClick={() => onDuplicate(index)}>
                  <CopyIcon size={14} />
                </IconButton>
                <IconButton
                  label="Delete question"
                  tone="danger"
                  disabled={!canDelete}
                  onClick={() => setConfirmDelete(true)}
                >
                  <TrashIcon size={14} />
                </IconButton>
              </div>
            </div>
          ) : (
            <div className={styles.quietType}>
              <QuietIcon size={13} />
              {QUESTION_TYPE_META[type].label}
            </div>
          )}

          <div className={styles.titleRow}>
            <button
              type="button"
              className={styles.dragHandle}
              aria-label={`Drag question ${index + 1}`}
              {...dragAttributes}
              {...dragListeners}
            >
              <GripIcon size={18} />
            </button>

            <QuestionPromptField
              index={index}
              questionId={questionId}
              autoFocus={autoFocusPrompt}
              onAutoFocused={onAutoFocused}
              onSelectType={typeChange.request}
            />
          </div>

          <div className={styles.fields}>
            {showDescription ? (
              <div className={styles.descriptionInput}>
                <Textarea
                  id={`question-${questionId}-description`}
                  placeholder="Add a description"
                  rows={2}
                  aria-label={`Question ${index + 1} description`}
                  {...register(`questions.${index}.description`)}
                  maxLength={QUESTION_DESCRIPTION_MAX}
                />
                <CharacterCount value={description} max={QUESTION_DESCRIPTION_MAX} />
              </div>
            ) : null}

            <QuestionTypeEditor
              type={type}
              index={index}
              questionId={questionId}
              isActive={isActive}
            />
            {issues.length > 0 ? (
              <div className={styles.issues} role="alert">
                {issues.map((issue) => (
                  <p key={issue.path} className={styles.issue}>
                    {issue.message}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog
        open={typeChange.pendingType !== null}
        title="Change question type?"
        description="Switching away from a choice question will remove its options."
        confirmLabel="Change type"
        tone="danger"
        onCancel={typeChange.cancel}
        onConfirm={typeChange.confirm}
      />

      <Dialog
        open={confirmDelete}
        title="Delete question?"
        description="This removes the question from your form. Save to keep the change."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(index);
        }}
      />
    </div>
  );
});
