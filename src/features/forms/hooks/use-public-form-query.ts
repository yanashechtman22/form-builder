import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/query-keys";

export function usePublicFormQuery(formId: string) {
  return useQuery({
    queryKey: queryKeys.forms.public(formId),
    queryFn: ({ signal }) => apiClient.getPublicForm({ params: { formId }, signal }),
    staleTime: 15_000,
  });
}
