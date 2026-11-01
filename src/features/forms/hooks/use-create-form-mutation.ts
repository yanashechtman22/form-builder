import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/query-keys";

export function useCreateFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.createForm(),
    onSuccess: (form) => {
      queryClient.setQueryData(queryKeys.forms.detail(form.id), form);
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.list() });
    },
  });
}
