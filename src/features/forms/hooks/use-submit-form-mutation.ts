import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SubmitFormRequest } from "@shared/contracts/submissions";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/query-keys";

type SubmitVariables = SubmitFormRequest & { idempotencyKey: string };

export function useSubmitFormMutation(formId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ idempotencyKey, ...body }: SubmitVariables) =>
      apiClient.submitForm({
        params: { formId },
        body,
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.forms.submissions(formId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.forms.list() });
    },
  });
}
