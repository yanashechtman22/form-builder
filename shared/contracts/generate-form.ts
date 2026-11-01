import { z } from "zod";
import {
  FORM_DESCRIPTION_MAX,
  FORM_TITLE_MAX,
  GENERATE_FORM_PROMPT_MAX,
  OPTION_LABEL_MAX,
  QUESTION_DESCRIPTION_MAX,
  QUESTION_PROMPT_MAX,
} from "./limits.js";
import { MAX_RATING_SCALE, MIN_RATING_SCALE, QUESTION_TYPES } from "./questions.js";

export const GENERATED_QUESTION_MAX = 20;

const GeneratedQuestionBaseSchema = z.object({
  prompt: z.string().trim().min(1).max(QUESTION_PROMPT_MAX),
  description: z.string().trim().max(QUESTION_DESCRIPTION_MAX).optional(),
  required: z.boolean().optional(),
});

const GeneratedChoiceSchema = GeneratedQuestionBaseSchema.extend({
  options: z.array(z.string().trim().min(1).max(OPTION_LABEL_MAX)).min(2).max(50),
});

export const GeneratedFormSchema = z.object({
  title: z.string().trim().min(1).max(FORM_TITLE_MAX),
  description: z.string().trim().max(FORM_DESCRIPTION_MAX).optional(),
  questions: z
    .array(
      z.discriminatedUnion("type", [
        GeneratedQuestionBaseSchema.extend({ type: z.literal("shortText") }),
        GeneratedQuestionBaseSchema.extend({ type: z.literal("longText") }),
        GeneratedQuestionBaseSchema.extend({
          type: z.literal("number"),
          min: z.number().optional(),
          max: z.number().optional(),
        }),
        GeneratedQuestionBaseSchema.extend({ type: z.literal("date") }),
        GeneratedChoiceSchema.extend({ type: z.literal("singleSelect") }),
        GeneratedChoiceSchema.extend({ type: z.literal("multiSelect") }),
        GeneratedQuestionBaseSchema.extend({
          type: z.literal("checkbox"),
          label: z.string().trim().min(1).max(OPTION_LABEL_MAX).optional(),
        }),
        GeneratedQuestionBaseSchema.extend({
          type: z.literal("rating"),
          max: z.number().int().min(MIN_RATING_SCALE).max(MAX_RATING_SCALE).optional(),
        }),
      ]),
    )
    .min(1)
    .max(GENERATED_QUESTION_MAX),
});

export type GeneratedForm = z.infer<typeof GeneratedFormSchema>;

export const GenerateFormRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(GENERATE_FORM_PROMPT_MAX),
});

export type GenerateFormRequest = z.infer<typeof GenerateFormRequestSchema>;

export const GENERATED_FORM_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "questions"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    questions: {
      type: "array",
      minItems: 1,
      maxItems: GENERATED_QUESTION_MAX,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "prompt"],
        properties: {
          type: { type: "string", enum: [...QUESTION_TYPES] },
          prompt: { type: "string" },
          description: { type: "string" },
          required: { type: "boolean" },
          options: { type: "array", items: { type: "string" } },
          label: { type: "string" },
          min: { type: "number" },
          max: { type: "number" },
        },
      },
    },
  },
} as const;
