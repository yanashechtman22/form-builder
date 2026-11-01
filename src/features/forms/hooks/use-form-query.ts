import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/query-keys";

export function useFormQuery(formId: string) {
  return useQuery({
    queryKey: queryKeys.forms.detail(formId),
    queryFn: ({ signal }) => apiClient.getForm({ params: { formId }, signal }),
    staleTime: 15_000,
  });
}
