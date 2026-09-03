import { STALE_TIME_DEFAULT } from '@comitium/schemas/api-query-policy';
import { skipToken, useQuery } from '@tanstack/react-query';
import { qk } from '@/hooks/query-keys';
import { getPipeline } from '@/lib/api/jobs-pipeline';
import type { PipelineResponse } from '@/lib/schemas/pipeline';

export function useQueryPipeline(jobId: string | null) {
  return useQuery<PipelineResponse>({
    queryKey: qk.jobs.pipeline(jobId),
    queryFn: jobId ? () => getPipeline(jobId) : skipToken,
    staleTime: STALE_TIME_DEFAULT,
  });
}
