import { z } from "zod";
import {
  OPTION_LABEL_MAX,
  QUESTION_DESCRIPTION_MAX,
  QUESTION_PROMPT_MAX,
} from "./limits.js";

export const QUESTION_TYPES = [
  "shortText",
  "longText",
  "number",
  "date",
  "singleSelect",
  "multiSelect",
  "checkbox",
  "rating",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QuestionTypeSchema = z.enum(QUESTION_TYPES);

export const OptionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(OPTION_LABEL_MAX),
});

export type Option = z.infer<typeof OptionSchema>;

const QuestionBaseSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().trim().min(1).max(QUESTION_PROMPT_MAX),
  description: z.string().trim().max(QUESTION_DESCRIPTION_MAX).optional(),
  required: z.boolean(),
});

const ChoiceOptionsSchema = z.array(OptionSchema).min(2).max(50);

export const ShortTextQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal("shortText"),
});

export const LongTextQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal("longText"),
});

export const NumberQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const DateQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal("date"),
});

export const SingleSelectQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal("singleSelect"),
  options: ChoiceOptionsSchema,
});

export const MultiSelectQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal("multiSelect"),
  options: ChoiceOptionsSchema,
});

export const DEFAULT_CHECKBOX_LABEL = "Yes";

export const CheckboxQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal("checkbox"),
  label: z.string().trim().min(1).max(OPTION_LABEL_MAX),
});

export function checkboxLabel(question: { label?: string }): string {
  const label = question.label?.trim();
  return label || DEFAULT_CHECKBOX_LABEL;
}

export const MIN_RATING_SCALE = 3;
export const MAX_RATING_SCALE = 10;
export const DEFAULT_RATING_SCALE = 5;

export const RatingQuestionSchema = QuestionBaseSchema.extend({
  type: z.literal("rating"),
  max: z.number().int().min(MIN_RATING_SCALE).max(MAX_RATING_SCALE),
});

export const QuestionSchema = z.discriminatedUnion("type", [
  ShortTextQuestionSchema,
  LongTextQuestionSchema,
  NumberQuestionSchema,
  DateQuestionSchema,
  SingleSelectQuestionSchema,
  MultiSelectQuestionSchema,
  CheckboxQuestionSchema,
  RatingQuestionSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;
export type ShortTextQuestion = z.infer<typeof ShortTextQuestionSchema>;
export type LongTextQuestion = z.infer<typeof LongTextQuestionSchema>;
export type NumberQuestion = z.infer<typeof NumberQuestionSchema>;
export type DateQuestion = z.infer<typeof DateQuestionSchema>;
export type SingleSelectQuestion = z.infer<typeof SingleSelectQuestionSchema>;
export type MultiSelectQuestion = z.infer<typeof MultiSelectQuestionSchema>;
export type CheckboxQuestion = z.infer<typeof CheckboxQuestionSchema>;
export type RatingQuestion = z.infer<typeof RatingQuestionSchema>;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  shortText: "Short text",
  longText: "Long text",
  number: "Number",
  date: "Date",
  singleSelect: "Single select",
  multiSelect: "Multi-select",
  checkbox: "Checkbox",
  rating: "Rating",
};

export function isChoiceQuestion(
  question: Question,
): question is SingleSelectQuestion | MultiSelectQuestion {
  return question.type === "singleSelect" || question.type === "multiSelect";
}

export function refineQuestionInvariants(
  question: Question,
  ctx: z.RefinementCtx,
  pathPrefix: Array<string | number> = [],
): void {
  if (question.type === "number") {
    if (
      question.min !== undefined &&
      question.max !== undefined &&
      question.min > question.max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum cannot be greater than maximum",
        path: [...pathPrefix, "min"],
      });
    }
  }

  if (question.type === "singleSelect" || question.type === "multiSelect") {
    const ids = new Set<string>();
    for (const [index, option] of question.options.entries()) {
      if (ids.has(option.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Option IDs must be unique",
          path: [...pathPrefix, "options", index, "id"],
        });
      }
      ids.add(option.id);
    }
  }
}
