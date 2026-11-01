import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { questionCardDomId, questionPromptDomId } from "../dom-ids";

/**
 * Returns a function that scrolls a question into view and focuses its prompt.
 * The card may not be mounted yet (e.g. we are navigating back to the editor),
 * so the work is retried after each route change until the card exists.
 */
export function useRevealQuestion(): (questionId: string) => void {
  const { pathname } = useLocation();
  const [targetId, setTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) {
      return;
    }
    const card = document.getElementById(questionCardDomId(targetId));
    if (!card) {
      return;
    }
    card.scrollIntoView({ block: "center" });
    document.getElementById(questionPromptDomId(targetId))?.focus();
    setTargetId(null);
  }, [targetId, pathname]);

  return setTargetId;
}
