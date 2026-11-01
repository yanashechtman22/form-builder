import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateFormRequest } from "@shared/contracts/forms";
import { apiClient } from "@/api/client";
import { cacheSavedForm } from "./cache-form";

export function useUpdateFormMutation(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateFormRequest) =>
      apiClient.updateForm({ params: { formId }, body }),
    onSuccess: (form) => {
      cacheSavedForm(queryClient, form);
    },
  });
}
