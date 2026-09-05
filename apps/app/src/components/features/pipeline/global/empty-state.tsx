import { EmptyState } from '@comitium/ui/empty-state';
import { BriefcaseIcon } from '@phosphor-icons/react';
import { CreateJobButton } from '@/components/features/job-creation/create-job-button';
import { HiringTeamIcon } from '@/lib/constants/domain-icons';

interface DashboardEmptyStateProps {
  isAdmin: boolean;
  onCreateJob?: () => void;
  createJobDisabledReason?: string;
}

export function DashboardEmptyState({ isAdmin, onCreateJob, createJobDisabledReason }: DashboardEmptyStateProps) {
  if (isAdmin || onCreateJob) {
    return (
      <EmptyState
        icon={BriefcaseIcon}
        title="No open jobs yet"
        description="Create a job to get started."
        className="flex-1"
      >
        {onCreateJob && (
          <CreateJobButton className="mt-5" onClick={onCreateJob} disabledReason={createJobDisabledReason} />
        )}
      </EmptyState>
    );
  }

  return (
    <EmptyState
      icon={HiringTeamIcon}
      title="No jobs assigned yet"
      description="You'll be added to a job's hiring team when there's a role that needs your involvement."
      className="flex-1"
    />
  );
}
