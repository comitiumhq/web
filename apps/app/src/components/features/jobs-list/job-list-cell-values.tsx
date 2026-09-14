import type { OrgJobListItem } from '@comitium/schemas/jobs';
import { StatusBadge } from '@comitium/ui/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import type { ReactNode } from 'react';

interface EmptyJobCellValueProps {
  children: ReactNode;
}

export function EmptyJobCellValue({ children }: EmptyJobCellValueProps) {
  return <span className="text-label-12 text-muted-foreground">{children}</span>;
}

interface InterviewPlanValueProps {
  name: string | null;
}

export function InterviewPlanValue({ name }: InterviewPlanValueProps) {
  if (!name) {
    return <EmptyJobCellValue>Not set</EmptyJobCellValue>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block truncate">{name}</span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}

interface PostingStatusValueProps {
  status: OrgJobListItem['postingStatus'];
}

export function PostingStatusValue({ status }: PostingStatusValueProps) {
  if (status === 'published') {
    return <StatusBadge label="Published" variant="success" />;
  }

  if (status === 'unpublished') {
    return <StatusBadge label="Unpublished" variant="secondary" />;
  }

  return <EmptyJobCellValue>No posting</EmptyJobCellValue>;
}
