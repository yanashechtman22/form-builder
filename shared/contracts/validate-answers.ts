import type { FormDefinition } from "./forms.js";
import type { Answer, SubmitFormRequest } from "./submissions.js";
import type { ApiIssue } from "./api-errors.js";
import type { Question } from "./questions.js";

function optionIds(question: Question): Set<string> {
  if (question.type === "singleSelect" || question.type === "multiSelect") {
    return new Set(question.options.map((option) => option.id));
  }
  return new Set();
}

function validateAnswerAgainstQuestion(
  question: Question,
  answer: Answer,
): ApiIssue[] {
  if (answer.type !== question.type) {
    return [
      {
        path: ["answers", answer.questionId, "type"],
        message: "Please check your answer and try again.",
      },
    ];
  }

  switch (question.type) {
    case "shortText":
    case "longText":
      return [];
    case "number": {
      if (answer.type !== "number") {
        return [];
      }
      const issues: ApiIssue[] = [];
      if (question.min !== undefined && answer.value < question.min) {
        issues.push({
          path: ["answers", question.id, "value"],
          message: `Must be at least ${question.min}`,
        });
      }
      if (question.max !== undefined && answer.value > question.max) {
        issues.push({
          path: ["answers", question.id, "value"],
          message: `Must be at most ${question.max}`,
        });
      }
      return issues;
    }
    case "date": {
      if (answer.type !== "date") {
        return [];
      }
      const parsed = new Date(`${answer.value}T00:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        return [
          {
            path: ["answers", question.id, "value"],
            message: "Enter a valid date",
          },
        ];
      }
      return [];
    }
    case "singleSelect": {
      if (answer.type !== "singleSelect") {
        return [];
      }
      if (!optionIds(question).has(answer.value)) {
        return [
          {
            path: ["answers", question.id, "value"],
            message: "Choose one of the available options",
          },
        ];
      }
      return [];
    }
    case "multiSelect": {
      if (answer.type !== "multiSelect") {
        return [];
      }
      const valid = optionIds(question);
      const seen = new Set<string>();
      const issues: ApiIssue[] = [];
      for (const optionId of answer.value) {
        if (!valid.has(optionId)) {
          issues.push({
            path: ["answers", question.id, "value"],
            message: "Choose from the available options",
          });
        }
        if (seen.has(optionId)) {
          issues.push({
            path: ["answers", question.id, "value"],
            message: "Each option can only be selected once",
          });
        }
        seen.add(optionId);
      }
      return issues;
    }
    case "checkbox":
      return [];
    case "rating": {
      if (answer.type !== "rating") {
        return [];
      }
      if (answer.value < 1 || answer.value > question.max) {
        return [
          {
            path: ["answers", question.id, "value"],
            message: `Choose a rating from 1 to ${question.max}`,
          },
        ];
      }
      return [];
    }
    default: {
      question satisfies never;
      return [
        {
          path: ["answers"],
          message: "Please check your answer and try again.",
        },
      ];
    }
  }
}

export function validateSubmissionAnswers(
  definition: FormDefinition,
  request: SubmitFormRequest,
): ApiIssue[] {
  const issues: ApiIssue[] = [];
  const questionsById = new Map(
    definition.questions.map((question) => [question.id, question]),
  );
  const answeredIds = new Set<string>();

  for (const [index, answer] of request.answers.entries()) {
    if (answeredIds.has(answer.questionId)) {
      issues.push({
        path: ["answers", index, "questionId"],
        message: "Please check your answers and try again.",
      });
      continue;
    }
    answeredIds.add(answer.questionId);

    const question = questionsById.get(answer.questionId);
    if (!question) {
      issues.push({
        path: ["answers", index, "questionId"],
        message: "Please check your answers and try again.",
      });
      continue;
    }

    issues.push(...validateAnswerAgainstQuestion(question, answer));
  }

  for (const question of definition.questions) {
    if (!question.required) {
      continue;
    }
    if (!answeredIds.has(question.id)) {
      issues.push({
        path: ["answers", question.id],
        message: "This question is required",
      });
    }
  }

  return issues;
}
