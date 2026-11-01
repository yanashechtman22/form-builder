import { useQuery } from "@tanstack/react-query";
import { listSubmissions } from "@/api/forms-api";
import { queryKeys } from "@/api/query-keys";

export function useSubmissionsQuery(formId: string) {
  return useQuery({
    queryKey: queryKeys.forms.submissions(formId),
    queryFn: ({ signal }) => listSubmissions(formId, signal),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
}
