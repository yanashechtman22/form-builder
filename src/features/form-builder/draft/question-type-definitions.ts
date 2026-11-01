import {
  DEFAULT_CHECKBOX_LABEL,
  DEFAULT_RATING_SCALE,
  type Option,
  type Question,
  type QuestionType,
} from "@shared/contracts/questions";
import type {
  DraftOf,
  DraftOption,
  DraftQuestion,
  DraftQuestionBase,
  DraftValidationIssue,
} from "./draft-types";

/**
 * Everything that differs per question type lives here, in one place.
 * Adding a type means adding one entry: the `Record` below makes the compiler
 * reject a missing one, so the draft helpers never need their own switch.
 */

type QuestionOf<T extends QuestionType> = Extract<Question, { type: T }>;
type CommonQuestionFields = Pick<Question, "id" | "prompt" | "description" | "required">;

type QuestionTypeDefinition<T extends QuestionType> = {
  /** A brand-new draft question of this type. */
  create: (base: DraftQuestionBase) => DraftOf<T>;
  /** Switching from another type; keep what carries over. Defaults to `create`. */
  convertFrom?: (base: DraftQuestionBase, previous: DraftQuestion) => DraftOf<T>;
  /** Type-specific problems that block saving. `path` is `questions.<index>`. */
  validate?: (draft: DraftOf<T>, path: string) => DraftValidationIssue[];
  /** The strict contract shape; `common` is already trimmed and defaulted. */
  toQuestion: (draft: DraftOf<T>, common: CommonQuestionFields) => QuestionOf<T>;
};

export function createId(): string {
  return crypto.randomUUID();
}

export function createDefaultOptions(): DraftOption[] {
  return [
    { id: createId(), label: "Option 1" },
    { id: createId(), label: "Option 2" },
  ];
}

export function isChoiceDraft(
  question: DraftQuestion,
): question is DraftOf<"singleSelect" | "multiSelect"> {
  return question.type === "singleSelect" || question.type === "multiSelect";
}

function optionsToCarryOver(previous: DraftQuestion): DraftOption[] {
  return isChoiceDraft(previous) ? previous.options : createDefaultOptions();
}

function toContractOptions(options: DraftOption[]): Option[] {
  return options.map((option) => ({ id: option.id, label: option.label.trim() }));
}

function validateChoiceOptions(
  draft: DraftOf<"singleSelect" | "multiSelect">,
  path: string,
): DraftValidationIssue[] {
  const issues: DraftValidationIssue[] = [];
  const filled = draft.options.filter((option) => option.label.trim().length > 0);
  if (filled.length < 2) {
    issues.push({ path: `${path}.options`, message: "Add at least two options" });
  }

  const seen = new Set<string>();
  draft.options.forEach((option, optionIndex) => {
    if (seen.has(option.id)) {
      issues.push({
        path: `${path}.options.${optionIndex}.id`,
        message: "Something went wrong with these options. Re-add them and try again.",
      });
    }
    seen.add(option.id);
    if (!option.label.trim()) {
      issues.push({
        path: `${path}.options.${optionIndex}.label`,
        message: "Every option needs a label",
      });
    }
  });
  return issues;
}

const DEFINITIONS: { [T in QuestionType]: QuestionTypeDefinition<T> } = {
  shortText: {
    create: (base) => ({ ...base, type: "shortText" }),
    toQuestion: (_draft, common) => ({ ...common, type: "shortText" }),
  },
  longText: {
    create: (base) => ({ ...base, type: "longText" }),
    toQuestion: (_draft, common) => ({ ...common, type: "longText" }),
  },
  date: {
    create: (base) => ({ ...base, type: "date" }),
    toQuestion: (_draft, common) => ({ ...common, type: "date" }),
  },
  number: {
    create: (base) => ({ ...base, type: "number" }),
    convertFrom: (base, previous) => ({
      ...base,
      type: "number",
      min: previous.type === "number" ? previous.min : undefined,
      max: previous.type === "number" ? previous.max : undefined,
    }),
    validate: (draft, path) =>
      draft.min !== undefined && draft.max !== undefined && draft.min > draft.max
        ? [{ path: `${path}.min`, message: "Minimum cannot be greater than maximum" }]
        : [],
    toQuestion: (draft, common) => ({
      ...common,
      type: "number",
      min: draft.min,
      max: draft.max,
    }),
  },
  singleSelect: {
    create: (base) => ({ ...base, type: "singleSelect", options: createDefaultOptions() }),
    convertFrom: (base, previous) => ({
      ...base,
      type: "singleSelect",
      options: optionsToCarryOver(previous),
    }),
    validate: validateChoiceOptions,
    toQuestion: (draft, common) => ({
      ...common,
      type: "singleSelect",
      options: toContractOptions(draft.options),
    }),
  },
  multiSelect: {
    create: (base) => ({ ...base, type: "multiSelect", options: createDefaultOptions() }),
    convertFrom: (base, previous) => ({
      ...base,
      type: "multiSelect",
      options: optionsToCarryOver(previous),
    }),
    validate: validateChoiceOptions,
    toQuestion: (draft, common) => ({
      ...common,
      type: "multiSelect",
      options: toContractOptions(draft.options),
    }),
  },
  checkbox: {
    create: (base) => ({ ...base, type: "checkbox", label: "" }),
    convertFrom: (base, previous) => ({
      ...base,
      type: "checkbox",
      label: previous.type === "checkbox" ? previous.label : "",
    }),
    toQuestion: (draft, common) => ({
      ...common,
      type: "checkbox",
      label: draft.label.trim() || DEFAULT_CHECKBOX_LABEL,
    }),
  },
  rating: {
    create: (base) => ({ ...base, type: "rating", max: DEFAULT_RATING_SCALE }),
    convertFrom: (base, previous) => ({
      ...base,
      type: "rating",
      max: previous.type === "rating" ? previous.max : DEFAULT_RATING_SCALE,
    }),
    toQuestion: (draft, common) => ({ ...common, type: "rating", max: draft.max }),
  },
};

export function definitionFor<T extends QuestionType>(type: T): QuestionTypeDefinition<T> {
  return DEFINITIONS[type];
}
