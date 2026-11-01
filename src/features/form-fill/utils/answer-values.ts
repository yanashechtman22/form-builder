import {
  LONG_TEXT_ANSWER_MAX,
  SHORT_TEXT_ANSWER_MAX,
} from "@shared/contracts/limits";
import type { Question } from "@shared/contracts/questions";
import type { Answer } from "@shared/contracts/submissions";

export type AnswerFormValues = Record<string, string | string[] | boolean | number | null>;

export function createEmptyAnswerValues(questions: Question[]): AnswerFormValues {
  const values: AnswerFormValues = {};
  for (const question of questions) {
    switch (question.type) {
      case "shortText":
      case "longText":
      case "date":
      case "singleSelect":
        values[question.id] = "";
        break;
      case "number":
      case "rating":
        values[question.id] = null;
        break;
      case "multiSelect":
        values[question.id] = [];
        break;
      case "checkbox":
        values[question.id] = false;
        break;
      default: {
        const _exhaustive: never = question;
        throw new Error(`Unhandled question type: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }
  return values;
}

export function numberRangeMessage(
  question: { min?: number; max?: number },
  value: number,
): string | undefined {
  if (question.min !== undefined && value < question.min) {
    return `Must be at least ${question.min}`;
  }
  if (question.max !== undefined && value > question.max) {
    return `Must be at most ${question.max}`;
  }
  return undefined;
}

export function numberRangeHint(question: { min?: number; max?: number }): string | undefined {
  if (question.min !== undefined && question.max !== undefined) {
    return `Enter a number from ${question.min} to ${question.max}`;
  }
  if (question.min !== undefined) {
    return `Enter a number of at least ${question.min}`;
  }
  if (question.max !== undefined) {
    return `Enter a number up to ${question.max}`;
  }
  return undefined;
}

export function buildAnswersFromValues(
  questions: Question[],
  values: AnswerFormValues,
): { ok: true; answers: Answer[] } | { ok: false; fieldErrors: Record<string, string> } {
  const answers: Answer[] = [];
  const fieldErrors: Record<string, string> = {};

  for (const question of questions) {
    const raw = values[question.id];

    switch (question.type) {
      case "shortText":
      case "longText": {
        const text = typeof raw === "string" ? raw.trim() : "";
        const max =
          question.type === "shortText" ? SHORT_TEXT_ANSWER_MAX : LONG_TEXT_ANSWER_MAX;
        if (!text) {
          if (question.required) {
            fieldErrors[question.id] = "This question is required";
          }
          break;
        }
        if (text.length > max) {
          fieldErrors[question.id] = `Keep this under ${max} characters`;
          break;
        }
        answers.push({
          questionId: question.id,
          type: question.type,
          value: text,
        });
        break;
      }
      case "number": {
        if (raw === null || raw === undefined || raw === "") {
          if (question.required) {
            fieldErrors[question.id] = "This question is required";
          }
          break;
        }
        const value = typeof raw === "number" ? raw : Number(raw);
        if (Number.isNaN(value)) {
          fieldErrors[question.id] = "Enter a valid number";
          break;
        }
        const rangeMessage = numberRangeMessage(question, value);
        if (rangeMessage) {
          fieldErrors[question.id] = rangeMessage;
          break;
        }
        answers.push({
          questionId: question.id,
          type: "number",
          value,
        });
        break;
      }
      case "date": {
        const value = typeof raw === "string" ? raw : "";
        if (!value) {
          if (question.required) {
            fieldErrors[question.id] = "This question is required";
          }
          break;
        }
        answers.push({
          questionId: question.id,
          type: "date",
          value,
        });
        break;
      }
      case "singleSelect": {
        const value = typeof raw === "string" ? raw : "";
        if (!value) {
          if (question.required) {
            fieldErrors[question.id] = "This question is required";
          }
          break;
        }
        answers.push({
          questionId: question.id,
          type: "singleSelect",
          value,
        });
        break;
      }
      case "multiSelect": {
        const selected = Array.isArray(raw) ? raw : [];
        if (selected.length === 0) {
          if (question.required) {
            fieldErrors[question.id] = "Select at least one option";
          }
          break;
        }
        answers.push({
          questionId: question.id,
          type: "multiSelect",
          value: selected,
        });
        break;
      }
      case "checkbox": {
        const checked = Boolean(raw);
        if (question.required && !checked) {
          fieldErrors[question.id] = "This question is required";
          break;
        }
        if (checked || question.required) {
          answers.push({
            questionId: question.id,
            type: "checkbox",
            value: checked,
          });
        }
        break;
      }
      case "rating": {
        if (raw === null || raw === undefined || raw === "") {
          if (question.required) {
            fieldErrors[question.id] = "This question is required";
          }
          break;
        }
        const value = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isInteger(value) || value < 1 || value > question.max) {
          fieldErrors[question.id] = `Choose a rating from 1 to ${question.max}`;
          break;
        }
        answers.push({
          questionId: question.id,
          type: "rating",
          value,
        });
        break;
      }
      default: {
        const _exhaustive: never = question;
        throw new Error(`Unhandled question type: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, answers };
}
