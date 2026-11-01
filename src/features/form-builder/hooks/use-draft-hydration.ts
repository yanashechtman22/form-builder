import { useCallback, useEffect, useState } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import type { FormEditorDto } from "@shared/contracts/forms";
import { editorDtoToDraft, type FormDraft } from "../draft/form-draft";

/**
 * Keeps the editable draft in sync with the saved form.
 *
 * The draft is one document: a cache update that arrives while it is dirty
 * would drop in-progress edits, so the saved form is only loaded into it
 * while the editor is clean and the incoming revision is newer.
 */
export function useDraftHydration(
  savedForm: FormEditorDto,
  onHydrated: (draft: FormDraft) => void,
) {
  const { reset, control } = useFormContext<FormDraft>();
  const { isDirty } = useFormState({ control });
  const [revision, setRevision] = useState<number | null>(null);

  useEffect(() => {
    if (isDirty) {
      return;
    }
    if (revision !== null && savedForm.revision <= revision) {
      return;
    }

    const draft = editorDtoToDraft(savedForm);
    reset(draft);
    setRevision(savedForm.revision);
    onHydrated(draft);
  }, [isDirty, onHydrated, reset, revision, savedForm]);

  /** Adopt the server's response to our own save as the new clean baseline. */
  const adoptSaved = useCallback(
    (saved: FormEditorDto) => {
      reset(editorDtoToDraft(saved));
      setRevision(saved.revision);
    },
    [reset],
  );

  return { revision, adoptSaved };
}
