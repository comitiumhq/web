import { careerJobQueryOptions } from '@comitium/jobs/query-options';
import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute } from '@tanstack/react-router';
import { CareerJobApplyPage } from '@/components/features/careers/career-job-apply-page';
import { CareerJobRouteError } from '@/components/features/careers/career-job-route-error';
import { publicJobsApi } from '@/lib/public-jobs-api';

export const Route = createFileRoute('/careers/$orgSlug/jobs/$postingSlug/apply')({
  loader: async ({ params, context }) => {
    if (!params.orgSlug) {
      throw new Error('Missing orgSlug for careers job apply route.');
    }

    return context.queryClient.fetchQuery(careerJobQueryOptions(publicJobsApi, params));
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Apply to ${loaderData?.title ?? 'job'} at ${loaderData?.org.name ?? 'Comitium'} | Comitium` },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  pendingComponent: PageLoader,
  errorComponent: CareerJobRouteError,
  component: CareerJobApplyRoutePage,
});

function CareerJobApplyRoutePage() {
  const job = Route.useLoaderData();

  return <CareerJobApplyPage job={job} />;
}
