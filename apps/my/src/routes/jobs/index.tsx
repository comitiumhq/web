import { JobBoard } from '@comitium/jobs/job-board';
import { jobsSearchSchema } from '@comitium/jobs/schemas';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { publicJobsApi } from '@/lib/public-jobs-api';

export const Route = createFileRoute('/jobs/')({
  validateSearch: (search) => jobsSearchSchema.catch({}).parse(search),
  head: () => ({ meta: [{ title: 'Jobs | Comitium' }, { name: 'robots', content: 'noindex,follow' }] }),
  component: JobsPage,
});

function JobsPage() {
  const { orgSlug, postingSlug, ...filters } = Route.useSearch();
  const selectedPosting = useMemo(() => {
    if (!orgSlug || !postingSlug) {
      return null;
    }

    return {
      orgSlug,
      postingSlug,
    };
  }, [orgSlug, postingSlug]);

  return (
    <JobBoard
      api={publicJobsApi}
      selectedPosting={selectedPosting}
      filters={filters}
      resolveApplyUrl={(path) => path}
    />
  );
}
