import { useState } from "react";
import clsx from "clsx";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  LONG_TEXT_ANSWER_MAX,
  SHORT_TEXT_ANSWER_MAX,
} from "@shared/contracts/limits";
import { checkboxLabel, type Question } from "@shared/contracts/questions";
import { CharacterCount } from "@/shared/ui/CharacterCount";
import { Input } from "@/shared/ui/Input";
import { NumberInput } from "@/shared/ui/NumberInput";
import { StarIcon } from "@/shared/ui/Icons";
import { Textarea } from "@/shared/ui/Textarea";
import {
  numberRangeHint,
  numberRangeMessage,
  type AnswerFormValues,
} from "../utils/answer-values";
import styles from "./QuestionResponseField.module.css";

type QuestionResponseFieldProps = {
  question: Question;
  disabled?: boolean;
};

export function QuestionResponseField({
  question,
  disabled = false,
}: QuestionResponseFieldProps) {
  const {
    register,
    control,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<AnswerFormValues>();

  const watchedValue = useWatch({ control, name: question.id });
  const textValue = typeof watchedValue === "string" ? watchedValue : "";

  const error = errors[question.id]?.message as string | undefined;
  const describedBy = clsx(
    question.description && `${question.id}-description`,
    error && `${question.id}-error`,
  );

  return (
    <fieldset
      className={styles.field}
      disabled={disabled}
      aria-labelledby={`${question.id}-prompt`}
    >
      <div id={`${question.id}-prompt`} className={styles.prompt}>
        {question.prompt}
        {question.required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
        {question.required ? <span className="visually-hidden"> (required)</span> : null}
      </div>

      {question.description ? (
        <p id={`${question.id}-description`} className={styles.description}>
          {question.description}
        </p>
      ) : null}

      {question.type === "shortText" ? (
        <>
          <Input
            className={styles.control}
            {...register(question.id)}
            aria-label={question.prompt}
            aria-describedby={describedBy || undefined}
            invalid={Boolean(error)}
            autoComplete="off"
            maxLength={SHORT_TEXT_ANSWER_MAX}
          />
          <CharacterCount value={textValue} max={SHORT_TEXT_ANSWER_MAX} />
        </>
      ) : null}

      {question.type === "longText" ? (
        <>
          <Textarea
            className={styles.control}
            {...register(question.id)}
            aria-label={question.prompt}
            aria-describedby={describedBy || undefined}
            invalid={Boolean(error)}
            rows={4}
            maxLength={LONG_TEXT_ANSWER_MAX}
          />
          <CharacterCount value={textValue} max={LONG_TEXT_ANSWER_MAX} />
        </>
      ) : null}

      {question.type === "number" ? (
        <Controller
          control={control}
          name={question.id}
          render={({ field }) => {
            const hint = numberRangeHint(question);
            const hintId = hint ? `${question.id}-range` : undefined;
            const numericValue = typeof field.value === "number" ? field.value : "";
            const numberDescribedBy = clsx(describedBy, hintId) || undefined;
            return (
              <>
                {hint ? (
                  <p id={hintId} className={styles.hint}>
                    {hint}
                  </p>
                ) : null}
                <NumberInput
                  className={styles.control}
                  value={numericValue}
                  onChange={(value) => {
                    field.onChange(value);
                    if (value === null) {
                      clearErrors(question.id);
                      return;
                    }
                    const message = numberRangeMessage(question, value);
                    if (message) {
                      setError(question.id, { type: "validate", message });
                    } else {
                      clearErrors(question.id);
                    }
                  }}
                  onBlur={field.onBlur}
                  min={question.min}
                  max={question.max}
                  allowNegative={question.min === undefined || question.min < 0}
                  aria-label={question.prompt}
                  aria-describedby={numberDescribedBy}
                  invalid={Boolean(error)}
                />
              </>
            );
          }}
        />
      ) : null}

      {question.type === "date" ? (
        <Input
          className={styles.control}
          type="date"
          {...register(question.id)}
          aria-label={question.prompt}
          aria-describedby={describedBy || undefined}
          invalid={Boolean(error)}
        />
      ) : null}

      {question.type === "singleSelect" ? (
        <div
          className={styles.options}
          role="radiogroup"
          aria-label={question.prompt}
          aria-describedby={describedBy || undefined}
        >
          {question.options.map((option) => (
            <label key={option.id} className={styles.option}>
              <input type="radio" value={option.id} {...register(question.id)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {question.type === "multiSelect" ? (
        <Controller
          control={control}
          name={question.id}
          render={({ field }) => {
            const selected = Array.isArray(field.value) ? field.value : [];
            return (
              <div
                className={styles.options}
                role="group"
                aria-label={question.prompt}
                aria-describedby={describedBy || undefined}
              >
                {question.options.map((option) => {
                  const checked = selected.includes(option.id);
                  return (
                    <label key={option.id} className={styles.option}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            field.onChange([...selected, option.id]);
                          } else {
                            field.onChange(selected.filter((id) => id !== option.id));
                          }
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            );
          }}
        />
      ) : null}

      {question.type === "checkbox" ? (
        <label className={styles.checkboxRow}>
          <input type="checkbox" {...register(question.id)} />
          <span>{checkboxLabel(question)}</span>
        </label>
      ) : null}

      {question.type === "rating" ? (
        <Controller
          control={control}
          name={question.id}
          render={({ field }) => (
            <StarRating
              name={question.id}
              max={question.max}
              value={typeof field.value === "number" ? field.value : null}
              label={question.prompt}
              describedBy={describedBy || undefined}
              onChange={(value) => field.onChange(value)}
            />
          )}
        />
      ) : null}

      {error ? (
        <p id={`${question.id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

type StarRatingProps = {
  name: string;
  max: number;
  value: number | null;
  label: string;
  describedBy?: string;
  onChange: (value: number) => void;
};

function StarRating({ name, max, value, label, describedBy, onChange }: StarRatingProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const highlighted = preview ?? value ?? 0;

  return (
    <div
      className={styles.rating}
      role="group"
      aria-label={label}
      onMouseLeave={() => setPreview(null)}
    >
      {Array.from({ length: max }, (_, index) => {
        const star = index + 1;
        const filled = star <= highlighted;
        return (
          <label
            key={star}
            className={clsx(styles.starButton, filled && styles.starButtonFilled)}
            onMouseEnter={() => setPreview(star)}
          >
            <input
              className={styles.starInput}
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              aria-label={String(star)}
              aria-describedby={describedBy}
              onFocus={() => setPreview(star)}
              onBlur={() => setPreview(null)}
              onChange={() => onChange(star)}
            />
            <span className={styles.starIndex} aria-hidden="true">
              {star}
            </span>
            <StarIcon filled={filled} />
          </label>
        );
      })}
    </div>
  );
}
