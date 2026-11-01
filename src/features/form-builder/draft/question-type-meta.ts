import type { ComponentType } from "react";
import {
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  type QuestionType,
} from "@shared/contracts/questions";
import {
  CheckboxIcon,
  DateIcon,
  LongTextIcon,
  MultiSelectIcon,
  NumberIcon,
  RatingIcon,
  ShortTextIcon,
  SingleSelectIcon,
} from "@/shared/ui/Icons";

type IconProps = { size?: number };

export const QUESTION_TYPE_META: Record<
  QuestionType,
  {
    label: string;
    description: string;
    keywords: string[];
    Icon: ComponentType<IconProps>;
  }
> = {
  shortText: {
    label: QUESTION_TYPE_LABELS.shortText,
    description: "Single-line answer",
    keywords: ["text", "short", "name", "email"],
    Icon: ShortTextIcon,
  },
  longText: {
    label: QUESTION_TYPE_LABELS.longText,
    description: "Multi-line paragraph",
    keywords: ["long", "paragraph", "essay", "textarea"],
    Icon: LongTextIcon,
  },
  number: {
    label: QUESTION_TYPE_LABELS.number,
    description: "Numeric value",
    keywords: ["number", "amount", "quantity"],
    Icon: NumberIcon,
  },
  date: {
    label: QUESTION_TYPE_LABELS.date,
    description: "Pick a date",
    keywords: ["date", "calendar", "day"],
    Icon: DateIcon,
  },
  singleSelect: {
    label: QUESTION_TYPE_LABELS.singleSelect,
    description: "Choose one option",
    keywords: ["single", "radio", "choice", "select"],
    Icon: SingleSelectIcon,
  },
  multiSelect: {
    label: QUESTION_TYPE_LABELS.multiSelect,
    description: "Choose multiple options",
    keywords: ["multi", "checkbox", "multiple", "tags"],
    Icon: MultiSelectIcon,
  },
  checkbox: {
    label: QUESTION_TYPE_LABELS.checkbox,
    description: "One checkbox with a label you write",
    keywords: ["yes", "no", "agree", "confirm", "boolean"],
    Icon: CheckboxIcon,
  },
  rating: {
    label: QUESTION_TYPE_LABELS.rating,
    description: "Stars from 1 up to a limit between 3 and 10",
    keywords: ["rating", "stars", "score", "nps"],
    Icon: RatingIcon,
  },
};

export function filterQuestionTypes(query: string): QuestionType[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...QUESTION_TYPES];
  }

  return QUESTION_TYPES.filter((type) => {
    const meta = QUESTION_TYPE_META[type];
    return (
      meta.label.toLowerCase().includes(normalized) ||
      meta.description.toLowerCase().includes(normalized) ||
      meta.keywords.some((keyword) => keyword.includes(normalized)) ||
      type.toLowerCase().includes(normalized)
    );
  });
}
