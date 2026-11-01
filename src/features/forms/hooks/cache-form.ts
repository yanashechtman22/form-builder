import type { QueryClient } from "@tanstack/react-query";
import type { FormEditorDto } from "@shared/contracts/forms";
import { queryKeys } from "@/api/query-keys";

export function cacheSavedForm(queryClient: QueryClient, form: FormEditorDto): void {
  queryClient.setQueryData(queryKeys.forms.detail(form.id), form);
  queryClient.setQueryData(queryKeys.forms.public(form.id), {
    id: form.id,
    revision: form.revision,
    title: form.title,
    description: form.description,
    questions: form.questions,
    acceptingResponses: form.acceptingResponses,
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.forms.list() });
}
