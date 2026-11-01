import { useQuery } from "@tanstack/react-query";
import { listForms } from "@/api/forms-api";
import { queryKeys } from "@/api/query-keys";

export function useFormsQuery() {
  return useQuery({
    queryKey: queryKeys.forms.list(),
    queryFn: ({ signal }) => listForms(signal),
    staleTime: 30_000,
  });
}
