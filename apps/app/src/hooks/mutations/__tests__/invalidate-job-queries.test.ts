import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { qk } from '@/hooks/query-keys';
import { invalidateJobQueries } from '../invalidate-job-queries';

const target = { orgId: 'org-1', jobId: 'job-1' };
const cachedQuery = (queryKey: QueryKey) => ({ queryKey, queryFn: vi.fn(() => null) });

describe('invalidateJobQueries', () => {
  it('refreshes inactive cached Job surfaces before the user navigates to them', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    });
    const affectedQueries = [
      cachedQuery(qk.jobs.detail(target.jobId)),
      cachedQuery(qk.jobs.summary(target.jobId)),
      cachedQuery(qk.jobs.editor(target.orgId, target.jobId)),
      cachedQuery(qk.jobs.posting(target.orgId, target.jobId)),
      cachedQuery(qk.jobs.orgAllPages(target.orgId)),
      cachedQuery(qk.jobs.draftsAllPages(target.orgId)),
    ];
    const unrelatedQuery = cachedQuery(qk.jobs.summary('job-2'));

    await Promise.all([...affectedQueries, unrelatedQuery].map((query) => queryClient.fetchQuery(query)));
    await invalidateJobQueries(queryClient, target);

    for (const query of affectedQueries) {
      expect(query.queryFn).toHaveBeenCalledTimes(2);
    }
    expect(unrelatedQuery.queryFn).toHaveBeenCalledOnce();
  });
});
