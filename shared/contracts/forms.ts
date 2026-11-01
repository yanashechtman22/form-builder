import { z } from "zod";
import { FORM_DESCRIPTION_MAX, FORM_TITLE_MAX } from "./limits.js";
import { QuestionSchema, refineQuestionInvariants } from "./questions.js";

const FormFieldsSchema = z.object({
  title: z.string().trim().min(1).max(FORM_TITLE_MAX),
  description: z.string().trim().max(FORM_DESCRIPTION_MAX).optional(),
  questions: z.array(QuestionSchema).min(1).max(100),
});

function refineFormDefinition(
  definition: z.infer<typeof FormFieldsSchema>,
  ctx: z.RefinementCtx,
): void {
  const ids = new Set<string>();
  for (const [index, question] of definition.questions.entries()) {
    if (ids.has(question.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Question IDs must be unique",
        path: ["questions", index, "id"],
      });
    }
    ids.add(question.id);
    refineQuestionInvariants(question, ctx, ["questions", index]);
  }
}

export const FormDefinitionSchema = FormFieldsSchema.superRefine(refineFormDefinition);
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;

export const CreateFormRequestSchema = FormDefinitionSchema;
export type CreateFormRequest = z.infer<typeof CreateFormRequestSchema>;

export const UpdateFormRequestSchema = FormFieldsSchema.extend({
  expectedRevision: z.number().int().positive(),
}).superRefine((data, ctx) => {
  refineFormDefinition(data, ctx);
});
export type UpdateFormRequest = z.infer<typeof UpdateFormRequestSchema>;

export const SetAcceptanceRequestSchema = z.object({
  acceptingResponses: z.boolean(),
});
export type SetAcceptanceRequest = z.infer<typeof SetAcceptanceRequestSchema>;

export const FormSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  questionCount: z.number().int().nonnegative(),
  submissionCount: z.number().int().nonnegative(),
  acceptingResponses: z.boolean(),
  updatedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type FormSummaryDto = z.infer<typeof FormSummaryDtoSchema>;

export const FormListDtoSchema = z.object({
  items: z.array(FormSummaryDtoSchema),
  nextCursor: z.string().uuid().nullable(),
});
export type FormListDto = z.infer<typeof FormListDtoSchema>;

export const FormEditorDtoSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(QuestionSchema),
  acceptingResponses: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FormEditorDto = z.infer<typeof FormEditorDtoSchema>;

export const PublicFormDtoSchema = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(QuestionSchema),
  acceptingResponses: z.boolean(),
});
export type PublicFormDto = z.infer<typeof PublicFormDtoSchema>;
