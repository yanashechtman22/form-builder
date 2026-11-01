import { checkboxLabel, type Question } from "@shared/contracts/questions";
import type { Answer } from "@shared/contracts/submissions";

export function formatAnswerValue(question: Question, answer: Answer | undefined): string {
  if (!answer) {
    return "No response";
  }

  switch (answer.type) {
    case "shortText":
    case "longText":
      return answer.value;
    case "number":
      return String(answer.value);
    case "date":
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(`${answer.value}T00:00:00`),
      );
    case "singleSelect": {
      if (question.type !== "singleSelect") {
        return answer.value;
      }
      return (
        question.options.find((option) => option.id === answer.value)?.label ??
        "Unknown option"
      );
    }
    case "multiSelect": {
      if (question.type !== "multiSelect") {
        return answer.value.join(", ");
      }
      const labels = answer.value.map(
        (optionId) =>
          question.options.find((option) => option.id === optionId)?.label ??
          "Unknown option",
      );
      return labels.join(", ");
    }
    case "checkbox":
      return answer.value
        ? question.type === "checkbox"
          ? checkboxLabel(question)
          : "Yes"
        : "No";
    case "rating":
      return `${answer.value}${question.type === "rating" ? ` / ${question.max}` : ""}`;
    default: {
      const _exhaustive: never = answer;
      return JSON.stringify(_exhaustive);
    }
  }
}
