import { Controller, useFormContext, useWatch, type FieldPath } from "react-hook-form";
import { OPTION_LABEL_MAX } from "@shared/contracts/limits";
import {
  DEFAULT_CHECKBOX_LABEL,
  DEFAULT_RATING_SCALE,
  MAX_RATING_SCALE,
  MIN_RATING_SCALE,
  type QuestionType,
} from "@shared/contracts/questions";
import { Input } from "@/shared/ui/Input";
import { Label } from "@/shared/ui/Label";
import { StarIcon } from "@/shared/ui/Icons";
import type { FormDraft } from "../../draft/form-draft";
import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";
import styles from "./question-type-editor.module.css";

type QuestionTypeEditorProps = {
  type: QuestionType;
  index: number;
  questionId: string;
  isActive: boolean;
};

export function QuestionTypeEditor({
  type,
  index,
  questionId,
  isActive,
}: QuestionTypeEditorProps) {
  switch (type) {
    case "shortText":
      return <ShortTextEditor />;
    case "longText":
      return <LongTextEditor />;
    case "date":
      return <DateEditor />;
    case "number":
      return <NumberEditor index={index} questionId={questionId} isActive={isActive} />;
    case "singleSelect":
    case "multiSelect":
      return <ChoiceEditor index={index} />;
    case "rating":
      return <RatingEditor index={index} questionId={questionId} isActive={isActive} />;
    case "checkbox":
      return <CheckboxEditor index={index} />;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function ShortTextEditor() {
  return (
    <div className={styles.typeSpecific}>
      <div className={styles.preview} aria-hidden="true">
        <div className={styles.previewInput}>Short answer</div>
      </div>
    </div>
  );
}

function LongTextEditor() {
  return (
    <div className={styles.typeSpecific}>
      <div className={`${styles.preview} ${styles.previewWide}`} aria-hidden="true">
        <div className={`${styles.previewInput} ${styles.previewTextarea}`}>Long answer</div>
      </div>
    </div>
  );
}

function DateEditor() {
  return (
    <div className={styles.typeSpecific}>
      <div className={styles.preview} aria-hidden="true">
        <Input type="date" disabled tabIndex={-1} className={styles.previewControl} />
      </div>
    </div>
  );
}

function NumberEditor({
  index,
  questionId,
  isActive,
}: {
  index: number;
  questionId: string;
  isActive: boolean;
}) {
  return (
    <div className={styles.typeSpecific}>
      <div className={styles.preview} aria-hidden="true">
        <div className={styles.previewInput}>Number</div>
      </div>
      {isActive ? (
        <div className={styles.bounds}>
          <BoundField id={`question-${questionId}-min`} label="Min" name={`questions.${index}.min`} />
          <BoundField id={`question-${questionId}-max`} label="Max" name={`questions.${index}.max`} />
        </div>
      ) : null}
    </div>
  );
}

function BoundField({
  id,
  label,
  name,
}: {
  id: string;
  label: string;
  name: Extract<FieldPath<FormDraft>, `questions.${number}.min` | `questions.${number}.max`>;
}) {
  const { control } = useFormContext<FormDraft>();

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={id}
            type="number"
            value={typeof field.value === "number" ? field.value : ""}
            onChange={(event) => {
              const next = event.target.value;
              field.onChange(next === "" ? undefined : Number(next));
            }}
          />
        )}
      />
    </div>
  );
}

function ChoiceEditor({ index }: { index: number }) {
  return (
    <div className={styles.typeSpecific}>
      <ChoiceOptionsEditor questionIndex={index} />
    </div>
  );
}

function RatingEditor({
  index,
  questionId,
  isActive,
}: {
  index: number;
  questionId: string;
  isActive: boolean;
}) {
  const { control } = useFormContext<FormDraft>();
  const max = useWatch({ control, name: `questions.${index}.max` });
  const previewScale = typeof max === "number" ? max : DEFAULT_RATING_SCALE;
  const scaleLabelId = `question-${questionId}-scale`;
  const limits = Array.from(
    { length: MAX_RATING_SCALE - MIN_RATING_SCALE + 1 },
    (_, optionIndex) => MIN_RATING_SCALE + optionIndex,
  );

  return (
    <div className={styles.typeSpecific}>
      <div className={styles.previewRating} aria-hidden="true">
        {Array.from({ length: previewScale }, (_, ratingIndex) => (
          <StarIcon key={ratingIndex} size={18} />
        ))}
      </div>
      {isActive ? (
        <div className={styles.scale}>
          <Label id={scaleLabelId}>Up to</Label>
          <Controller
            control={control}
            name={`questions.${index}.max`}
            render={({ field }) => (
              <div className={styles.scaleList} role="group" aria-labelledby={scaleLabelId}>
                {limits.map((limit) => (
                  <label key={limit} className={styles.scaleOption}>
                    <input
                      className={styles.scaleInput}
                      type="radio"
                      name={`question-${questionId}-scale`}
                      checked={field.value === limit}
                      onChange={() => field.onChange(limit)}
                    />
                    {limit}
                  </label>
                ))}
              </div>
            )}
          />
        </div>
      ) : null}
    </div>
  );
}

function CheckboxEditor({ index }: { index: number }) {
  const { register } = useFormContext<FormDraft>();

  return (
    <div className={styles.typeSpecific}>
      <div className={styles.checkboxLabelRow}>
        <input type="checkbox" disabled tabIndex={-1} aria-hidden="true" />
        <Input
          placeholder={DEFAULT_CHECKBOX_LABEL}
          aria-label={`Question ${index + 1} checkbox label`}
          {...register(`questions.${index}.label`)}
          maxLength={OPTION_LABEL_MAX}
        />
      </div>
    </div>
  );
}
