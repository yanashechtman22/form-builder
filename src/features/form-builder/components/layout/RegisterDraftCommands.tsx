import { useEffect } from "react";
import { useFormState } from "react-hook-form";
import { useCommandBridge } from "@/app/command-bridge-context";
import { useFormDraft } from "../../hooks/form-draft-context";

export function RegisterDraftCommands() {
  const { formId, save, insertQuestion, savedForm } = useFormDraft();
  const { isDirty } = useFormState();
  const { setDraft } = useCommandBridge();

  useEffect(() => {
    setDraft({
      formId,
      hasUnsavedChanges: isDirty,
      acceptingResponses: savedForm.acceptingResponses,
      save,
      insertQuestion,
    });
    return () => setDraft(null);
  }, [formId, insertQuestion, isDirty, save, savedForm.acceptingResponses, setDraft]);

  return null;
}
