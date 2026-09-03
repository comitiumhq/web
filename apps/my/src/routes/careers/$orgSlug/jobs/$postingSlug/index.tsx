import { CareerJobDetailPage } from '@comitium/jobs/careers';
import { careerJobQueryOptions } from '@comitium/jobs/query-options';
import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute } from '@tanstack/react-router';
import { publicJobsApi } from '@/lib/public-jobs-api';

export const Route = createFileRoute('/careers/$orgSlug/jobs/$postingSlug/')({
  loader: async ({ params, context }) => {
    if (!params.orgSlug) {
      throw new Error('Missing orgSlug for careers job route.');
    }

    return context.queryClient.ensureQueryData(careerJobQueryOptions(publicJobsApi, params));
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? 'Job'} at ${loaderData?.org.name ?? 'Comitium'} | Comitium` },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }),
  pendingComponent: PageLoader,
  component: CareerJobRoutePage,
});

function CareerJobRoutePage() {
  const job = Route.useLoaderData();

  return <CareerJobDetailPage job={job} />;
}
