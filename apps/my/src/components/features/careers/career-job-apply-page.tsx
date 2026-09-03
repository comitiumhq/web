import { CareerJobDetailPage } from '@comitium/jobs/careers';
import type { CareerJob } from '@comitium/jobs/schemas';
import { CareerJobApplyPanel } from './career-job-apply-panel';

interface CareerJobApplyPageProps {
  job: CareerJob;
}

export function CareerJobApplyPage({ job }: CareerJobApplyPageProps) {
  const companyName = job.org.name ?? job.companyInfo?.name ?? 'Organization';

  return (
    <CareerJobDetailPage
      job={job}
      initialTab="apply"
      applyContent={<CareerJobApplyPanel job={job} companyName={companyName} />}
    />
  );
}
