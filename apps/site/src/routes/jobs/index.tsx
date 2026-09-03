import { JobBoard } from '@comitium/jobs/job-board';
import { jobsSearchSchema } from '@comitium/jobs/schemas';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';
import { getMyUrl } from '@/config/web-origins';
import { publicJobsApi } from '@/lib/public-jobs-api';
import { buildBreadcrumbJsonLd, jsonLdMeta } from '@/lib/seo/json-ld';
import { buildSeoHead } from '@/lib/seo/public';

export const Route = createFileRoute('/jobs/')({
  validateSearch: (search) => jobsSearchSchema.catch({}).parse(search),
  head: ({ match }) => {
    const head = buildSeoHead({
      title: 'Jobs | Comitium',
      description: 'Browse open roles from teams hiring through Comitium.',
      path: '/jobs',
      noindex: Object.keys(match.search).length > 0,
    });

    return {
      ...head,
      meta: [...head.meta, jsonLdMeta(buildBreadcrumbJsonLd([{ name: 'Jobs', path: '/jobs' }]))],
    };
  },
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
    <JobBoard api={publicJobsApi} selectedPosting={selectedPosting} filters={filters} resolveApplyUrl={getMyUrl} />
  );
}
