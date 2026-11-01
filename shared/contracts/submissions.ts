import { z } from "zod";
import { FormDefinitionSchema } from "./forms.js";
import { LONG_TEXT_ANSWER_MAX, SHORT_TEXT_ANSWER_MAX } from "./limits.js";
import { QuestionTypeSchema } from "./questions.js";

const AnswerBaseSchema = z.object({
  questionId: z.string().uuid(),
});

export const ShortTextAnswerSchema = AnswerBaseSchema.extend({
  type: z.literal("shortText"),
  value: z.string().trim().min(1).max(SHORT_TEXT_ANSWER_MAX),
});

export const LongTextAnswerSchema = AnswerBaseSchema.extend({
  type: z.literal("longText"),
  value: z.string().trim().min(1).max(LONG_TEXT_ANSWER_MAX),
});

export const NumberAnswerSchema = AnswerBaseSchema.extend({
  type: z.literal("number"),
  value: z.number(),
});

export const DateAnswerSchema = AnswerBaseSchema.extend({
  type: z.literal("date"),
  value: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const SingleSelectAnswerSchema = AnswerBaseSchema.extend({
  type: z.literal("singleSelect"),
  value: z.string().uuid(),
});

export const MultiSelectAnswerSchema = AnswerBaseSchema.extend({
  type: z.literal("multiSelect"),
  value: z.array(z.string().uuid()).min(1),
});

export const CheckboxAnswerSchema = AnswerBaseSchema.extend({
  type: z.literal("checkbox"),
  value: z.boolean(),
});

export const RatingAnswerSchema = AnswerBaseSchema.extend({
  type: z.literal("rating"),
  value: z.number().int().positive(),
});

export const AnswerSchema = z.discriminatedUnion("type", [
  ShortTextAnswerSchema,
  LongTextAnswerSchema,
  NumberAnswerSchema,
  DateAnswerSchema,
  SingleSelectAnswerSchema,
  MultiSelectAnswerSchema,
  CheckboxAnswerSchema,
  RatingAnswerSchema,
]);

export type Answer = z.infer<typeof AnswerSchema>;

export const SubmitFormRequestSchema = z.object({
  formRevision: z.number().int().positive(),
  answers: z.array(AnswerSchema).max(100),
});
export type SubmitFormRequest = z.infer<typeof SubmitFormRequestSchema>;

export const SubmissionReceiptDtoSchema = z.object({
  id: z.string().uuid(),
  submittedAt: z.string().datetime(),
});
export type SubmissionReceiptDto = z.infer<typeof SubmissionReceiptDtoSchema>;

export const SubmissionDtoSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  formRevision: z.number().int().positive(),
  submittedAt: z.string().datetime(),
  formSnapshot: FormDefinitionSchema,
  answers: z.array(AnswerSchema),
});
export type SubmissionDto = z.infer<typeof SubmissionDtoSchema>;

export const SubmissionListDtoSchema = z.object({
  items: z.array(SubmissionDtoSchema),
  nextCursor: z.string().uuid().nullable(),
});
export type SubmissionListDto = z.infer<typeof SubmissionListDtoSchema>;

export const AnswerTypeSchema = QuestionTypeSchema;
