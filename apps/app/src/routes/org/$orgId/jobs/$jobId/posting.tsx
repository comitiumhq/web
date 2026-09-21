import { createFileRoute } from '@tanstack/react-router';
import { JobPostingPage } from '@/components/features/job-posting/job-posting-page';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/posting')({
  ssr: false,
  component: PostingRoute,
});

function PostingRoute() {
  const { orgId, jobId } = Route.useParams();

  return <JobPostingPage orgId={orgId} jobId={jobId} />;
}
