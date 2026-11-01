import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/query-keys";

export function useDeleteFormMutation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (formId: string) => apiClient.deleteForm({ params: { formId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.list() });
    },
  });

  /**
   * Drops everything cached for a deleted form.
   *
   * This is separate from `onSuccess` on purpose: removing the form's query
   * while a page is still showing it makes that page refetch, get a 404 and
   * replace itself with an error (unmounting the code that was about to
   * navigate away). Call it once nothing is displaying the form any more.
   */
  const forget = useCallback(
    (formId: string) => {
      queryClient.removeQueries({ queryKey: queryKeys.forms.detail(formId) });
      queryClient.removeQueries({ queryKey: queryKeys.forms.public(formId) });
      queryClient.removeQueries({ queryKey: queryKeys.forms.submissions(formId) });
    },
    [queryClient],
  );

  return { ...mutation, forget };
}
