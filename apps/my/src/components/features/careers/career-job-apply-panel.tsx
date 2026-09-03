import { getPublicApplicationAvailability, type PublicApplicationAvailability } from '@comitium/jobs/application';
import type { CareerJob } from '@comitium/jobs/schemas';
import type { JobApplicationData } from '@comitium/schemas/jobs';
import { EmptyState } from '@comitium/ui/empty-state';
import { Skeleton } from '@comitium/ui/skeleton';
import { FileXIcon, type Icon as PhosphorIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import type { Address } from 'viem';
import { ApplicationForm } from '@/components/features/job-application';
import { useQueryApplyForm } from '@/hooks/queries/use-query-apply-form';

interface CareerJobApplyPanelProps {
  job: CareerJob;
  companyName: string;
}

type UnavailableApplicationState = Exclude<PublicApplicationAvailability, 'accepting'>;

const UNAVAILABLE_APPLICATION_COPY: Record<
  UnavailableApplicationState,
  { icon: PhosphorIcon; title: string; description: string }
> = {
  closed: {
    icon: FileXIcon,
    title: 'Applications closed',
    description: 'This role is no longer accepting applications.',
  },
  'capacity-reached': {
    icon: FileXIcon,
    title: 'Applications full',
    description:
      'This role has reached its application capacity. The hiring team is still reviewing submitted applications.',
  },
  unavailable: {
    icon: FileXIcon,
    title: 'Applications unavailable',
    description: 'This role is not accepting committed applications right now.',
  },
};

function ApplicationFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-28 w-full rounded-md" />
      </div>

      <Skeleton className="h-10 w-full rounded-md" />

      <div className="space-y-2 px-1">
        <Skeleton className="h-3.5 w-[82%]" />
        <Skeleton className="h-3.5 w-[64%]" />
      </div>
    </div>
  );
}

export function CareerJobApplyPanel({ job, companyName }: CareerJobApplyPanelProps) {
  const privacyConfigured = Boolean(job.recruitingPrivacy.controllerName && job.recruitingPrivacy.privacyPolicyUrl);
  const applicationAvailability = getPublicApplicationAvailability(job);
  const applyFormTarget = useMemo(() => {
    if (applicationAvailability !== 'accepting' || !privacyConfigured) {
      return null;
    }

    return {
      orgSlug: job.org.careersSlug,
      postingSlug: job.postingSlug,
    };
  }, [applicationAvailability, job.org.careersSlug, job.postingSlug, privacyConfigured]);
  const { data: applyForm, isLoading: formLoading, error: formError } = useQueryApplyForm(applyFormTarget);

  const jobData = useMemo<JobApplicationData | null>(() => {
    if (
      job.jobId === null ||
      job.chainId === null ||
      job.commitmentContract === null ||
      job.creatorAddress === null ||
      job.responseDeadlineDays === null
    ) {
      return null;
    }

    return {
      id: job.id,
      postingId: job.postingId,
      chainId: job.chainId,
      jobId: job.jobId,
      commitmentContract: job.commitmentContract,
      orgId: job.orgId,
      creatorAddress: job.creatorAddress as Address,
    };
  }, [job]);

  if (formLoading) {
    return <ApplicationFormSkeleton />;
  }

  if (applicationAvailability !== 'accepting') {
    const copy = UNAVAILABLE_APPLICATION_COPY[applicationAvailability];

    return <EmptyState icon={copy.icon} title={copy.title} description={copy.description} className="min-h-80" />;
  }

  if (!jobData || job.responseDeadlineDays === null) {
    return (
      <EmptyState
        icon={FileXIcon}
        title="Applications unavailable"
        description="This role is not accepting committed applications right now."
        className="min-h-80"
      />
    );
  }

  if (!privacyConfigured || formError || !applyForm) {
    return (
      <EmptyState
        icon={WarningCircleIcon}
        title="Application form unavailable"
        description="Applications are temporarily unavailable. Please contact the hiring organization."
        className="min-h-80"
      />
    );
  }

  return (
    <ApplicationForm
      applyForm={applyForm}
      jobData={jobData}
      jobTitle={job.title ?? 'Untitled'}
      company={companyName}
      responseDeadlineDays={job.responseDeadlineDays}
      policy={job.recruitingPrivacy}
    />
  );
}
