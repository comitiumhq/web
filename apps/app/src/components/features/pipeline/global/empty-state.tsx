import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { BriefcaseIcon, PlusIcon } from '@phosphor-icons/react';
import { HiringTeamIcon } from '@/lib/constants/domain-icons';

interface DashboardEmptyStateProps {
  isAdmin: boolean;
  onCreateJob?: () => void;
}

export function DashboardEmptyState({ isAdmin, onCreateJob }: DashboardEmptyStateProps) {
  if (isAdmin || onCreateJob) {
    return (
      <EmptyState
        icon={BriefcaseIcon}
        title="No open jobs yet"
        description="Post your first job to start receiving applications."
        className="flex-1"
      >
        {onCreateJob && (
          <Button className="mt-5" onClick={onCreateJob}>
            <PlusIcon data-icon="inline-start" />
            New Job
          </Button>
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
