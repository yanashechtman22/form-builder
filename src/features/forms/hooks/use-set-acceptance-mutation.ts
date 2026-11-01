import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { cacheSavedForm } from "./cache-form";

type SetAcceptanceInput = {
  formId: string;
  acceptingResponses: boolean;
};

export function useSetAcceptanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ formId, acceptingResponses }: SetAcceptanceInput) =>
      apiClient.setAcceptance({
        params: { formId },
        body: { acceptingResponses },
      }),
    onSuccess: (form) => {
      cacheSavedForm(queryClient, form);
    },
  });
}
