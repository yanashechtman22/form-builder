import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  CommandBridgeContext,
  type DraftCommandBridge,
} from "./command-bridge-context";

export function CommandBridgeProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<DraftCommandBridge | null>(null);
  const setDraft = useCallback((value: DraftCommandBridge | null) => {
    setDraftState(value);
  }, []);

  const value = useMemo(() => ({ draft, setDraft }), [draft, setDraft]);

  return (
    <CommandBridgeContext.Provider value={value}>{children}</CommandBridgeContext.Provider>
  );
}
