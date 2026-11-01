import { useEffect } from "react";

/** Binds Cmd/Ctrl+S to `save` and stops the browser's own "save page" dialog. */
export function useSaveShortcut(save: () => Promise<boolean>): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isModifier = event.metaKey || event.ctrlKey;
      if (isModifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);
}
