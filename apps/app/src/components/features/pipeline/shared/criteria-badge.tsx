import { Badge } from '@comitium/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';
import { cn } from '@/lib/utils';

interface CriteriaBadgeProps {
  candidate: PipelineCandidate;
  className?: string;
  labelVariant?: 'compact' | 'descriptive';
}

export function getCriteriaLabel(candidate: PipelineCandidate): string {
  const summary = candidate.criterionSummary;

  if (!summary || summary.totalCount === 0) {
    return '—';
  }

  return `${summary.metCount}/${summary.totalCount}`;
}

export function CriteriaBadge({ candidate, className, labelVariant = 'compact' }: CriteriaBadgeProps) {
  const summary = candidate.criterionSummary;

  if (!summary || summary.totalCount === 0) {
    return null;
  }

  const compactLabel = getCriteriaLabel(candidate);
  const label = labelVariant === 'descriptive' ? `${compactLabel} criteria` : compactLabel;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex w-fit">
          <Badge variant="secondary" className={cn('tabular-nums', className)}>
            {label}
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {summary.metCount} met, {summary.notMetCount} not met, {summary.undecidedCount} undecided
      </TooltipContent>
    </Tooltip>
  );
}
