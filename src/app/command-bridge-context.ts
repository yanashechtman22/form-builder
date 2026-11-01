import { createContext, useContext } from "react";
import type { QuestionType } from "@shared/contracts/questions";

export type DraftCommandBridge = {
  formId: string;
  hasUnsavedChanges: boolean;
  acceptingResponses: boolean;
  save: () => Promise<boolean>;
  insertQuestion: (type?: QuestionType, afterIndex?: number) => string;
};

export type CommandBridgeContextValue = {
  draft: DraftCommandBridge | null;
  setDraft: (value: DraftCommandBridge | null) => void;
};

export const CommandBridgeContext = createContext<CommandBridgeContextValue | null>(null);

export function useCommandBridge(): CommandBridgeContextValue {
  const value = useContext(CommandBridgeContext);
  if (!value) {
    throw new Error("useCommandBridge must be used within CommandBridgeProvider");
  }
  return value;
}
