import { CareerJobDetailPage } from '@comitium/jobs/careers';
import { careerJobQueryOptions } from '@comitium/jobs/query-options';
import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute } from '@tanstack/react-router';
import { getMyUrl } from '@/config/web-origins';
import { publicJobsApi } from '@/lib/public-jobs-api';
import { buildJobPostingJsonLd } from '@/lib/seo/job-posting-json-ld';
import { buildBreadcrumbJsonLd, jsonLdMeta } from '@/lib/seo/json-ld';
import { boundedSeoDescription, buildSeoHead } from '@/lib/seo/public';

export const Route = createFileRoute('/careers/$orgSlug/jobs/$postingSlug/')({
  loader: async ({ params, context }) => {
    if (!params.orgSlug) {
      throw new Error('Missing orgSlug for careers job route.');
    }

    return context.queryClient.ensureQueryData(careerJobQueryOptions(publicJobsApi, params));
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: 'Job | Comitium' }],
      };
    }

    const title = loaderData.title ?? 'Job';
    const orgName = loaderData.org.name;
    const description = boundedSeoDescription(
      loaderData.socialDescription,
      `View the ${title} role at ${orgName} on Comitium.`,
    );
    const path = loaderData.canonicalUrl ?? `/careers/${params.orgSlug}/jobs/${params.postingSlug}`;
    const orgSlug = loaderData.org.careersSlug ?? params.orgSlug;
    const head = buildSeoHead({
      title: `${title} at ${orgName} | Comitium`,
      description,
      path,
      type: 'article',
    });
    const structuredData = [
      jsonLdMeta(
        buildBreadcrumbJsonLd([
          { name: 'Jobs', path: '/jobs' },
          { name: `${orgName} Careers`, path: `/careers/${orgSlug}` },
          { name: title, path },
        ]),
      ),
      jsonLdMeta(buildJobPostingJsonLd(loaderData)),
    ];

    return {
      ...head,
      meta: [...head.meta, ...structuredData],
    };
  },
  pendingComponent: PageLoader,
  component: CareerJobRoutePage,
});

function CareerJobRoutePage() {
  const job = Route.useLoaderData();
  const applyPath = `/careers/${job.org.careersSlug}/jobs/${job.postingSlug}/apply`;

  return <CareerJobDetailPage job={job} applyUrl={getMyUrl(applyPath)} />;
}
