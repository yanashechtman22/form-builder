import { useEffect } from "react";
import { useBlocker, type BlockerFunction } from "react-router-dom";

export function useBlockUnsavedChanges(
  shouldBlock: boolean | BlockerFunction,
  warnOnUnload?: boolean,
) {
  const blocker = useBlocker(shouldBlock);
  const unload =
    warnOnUnload ?? (typeof shouldBlock === "boolean" ? shouldBlock : false);

  useEffect(() => {
    if (!unload) {
      return;
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unload]);

  return blocker;
}
