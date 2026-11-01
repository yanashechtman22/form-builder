import type { ReactNode } from "react";
import {
  FormDraftContext,
  type FormDraftContextValue,
} from "./form-draft-context";

type FormDraftProviderProps = {
  value: FormDraftContextValue;
  children: ReactNode;
};

export function FormDraftProvider({ value, children }: FormDraftProviderProps) {
  return <FormDraftContext.Provider value={value}>{children}</FormDraftContext.Provider>;
}
