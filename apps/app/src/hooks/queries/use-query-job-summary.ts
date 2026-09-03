import { useQuery } from '@tanstack/react-query';

import { jobSummaryQueryOptions } from '@/config/query-options';

export function useQueryJobSummary(id: string | null) {
  return useQuery(jobSummaryQueryOptions(id));
}
