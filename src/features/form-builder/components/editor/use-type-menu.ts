import { useCallback, useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import type { QuestionType } from "@shared/contracts/questions";
import { filterQuestionTypes } from "../../draft/question-type-meta";

export type TypeMenuKeyAction =
  | { type: "close" }
  | { type: "select"; questionType: QuestionType }
  | { type: "none" };

export function useTypeMenu(open: boolean, query: string) {
  const listboxId = useId().replace(/:/g, "");
  const [activeIndex, setActiveIndex] = useState(0);
  const types = useMemo(() => filterQuestionTypes(query), [query]);
  const safeIndex = types.length === 0 ? 0 : Math.min(activeIndex, types.length - 1);
  const activeType = types[safeIndex];
  const activeOptionId = activeType ? typeOptionId(listboxId, activeType) : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [open, query]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): TypeMenuKeyAction => {
      if (!open) {
        return { type: "none" };
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return { type: "close" };
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, Math.max(types.length - 1, 0)));
        return { type: "none" };
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return { type: "none" };
      }
      if (event.key === "Enter" && types.length > 0) {
        const selected = types[Math.min(activeIndex, types.length - 1)];
        if (selected) {
          event.preventDefault();
          return { type: "select", questionType: selected };
        }
      }
      return { type: "none" };
    },
    [activeIndex, open, types],
  );

  return {
    listboxId,
    types,
    activeIndex: safeIndex,
    setActiveIndex,
    activeOptionId,
    onKeyDown,
    optionId: (type: QuestionType) => typeOptionId(listboxId, type),
  };
}

function typeOptionId(listboxId: string, type: QuestionType): string {
  return `${listboxId}-${type}`;
}
