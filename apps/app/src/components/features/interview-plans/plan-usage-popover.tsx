import { Separator } from '@comitium/ui/separator';
import { Link } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import { useCallback, useState } from 'react';
import { useQueryInterviewPlanUsage } from '@/hooks/queries/use-query-interview-plan-usage';
import type { InterviewPlanUsage } from '@/lib/schemas/pipeline';

import {
  formatJobAndTemplateUsageLabel,
  formatUsageCount,
  JOB_TEMPLATE_USAGE_STATUS_LABELS,
  JOB_USAGE_STATUS_LABELS,
  USAGE_LINK_CLASS_NAME,
  UsageEmptyState,
  UsageLinkMeta,
  UsagePopover,
  UsageSectionTitle,
} from '../settings-library/usage-popover';

interface PlanUsagePopoverProps {
  orgId: string;
  planId: string;
  planName: string;
  jobCount: number;
  jobTemplateCount: number;
}

export function formatPlanUsageArchiveImpact(jobCount: number, jobTemplateCount: number) {
  const parts: string[] = [];

  if (jobCount > 0) {
    parts.push(formatUsageCount(jobCount, 'job'));
  }

  if (jobTemplateCount > 0) {
    parts.push(formatUsageCount(jobTemplateCount, 'job template'));
  }

  if (parts.length === 0) {
    return null;
  }

  return `${parts.join(' and ')} will remain linked to it.`;
}

interface UsageListProps {
  orgId: string;
  usage: InterviewPlanUsage;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}

function UsageList({ orgId, usage, onNavigate }: UsageListProps) {
  const hasJobs = usage.jobs.length > 0;
  const hasJobTemplates = usage.jobTemplates.length > 0;

  if (!hasJobs && !hasJobTemplates) {
    return <UsageEmptyState>No jobs or job templates use this plan.</UsageEmptyState>;
  }

  return (
    <div className="max-h-80 overflow-y-auto p-2">
      {hasJobs && (
        <section>
          <UsageSectionTitle label="Jobs" count={usage.jobs.length} />
          {usage.jobs.map((job) => (
            <Link
              key={job.id}
              to="/org/$orgId/jobs/$jobId/interview-plan"
              params={{ orgId, jobId: job.id }}
              className={USAGE_LINK_CLASS_NAME}
              onClick={onNavigate}
            >
              <span className="min-w-0 truncate text-copy-14">{job.title ?? 'Untitled job'}</span>
              <UsageLinkMeta label={JOB_USAGE_STATUS_LABELS[job.status]} />
            </Link>
          ))}
        </section>
      )}

      {hasJobs && hasJobTemplates && <Separator className="my-2" />}

      {hasJobTemplates && (
        <section>
          <UsageSectionTitle label="Job templates" count={usage.jobTemplates.length} />
          {usage.jobTemplates.map((template) => (
            <Link
              key={template.id}
              to="/org/$orgId/organization/job-templates"
              params={{ orgId }}
              search={{ templateId: template.id }}
              className={USAGE_LINK_CLASS_NAME}
              onClick={onNavigate}
            >
              <span className="min-w-0 truncate text-copy-14">{template.title}</span>
              <UsageLinkMeta label={JOB_TEMPLATE_USAGE_STATUS_LABELS[template.status]} />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

export function PlanUsagePopover({ orgId, planId, planName, jobCount, jobTemplateCount }: PlanUsagePopoverProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQueryInterviewPlanUsage(orgId, planId, open);
  const label = formatJobAndTemplateUsageLabel(jobCount, jobTemplateCount);
  const hasUsage = jobCount > 0 || jobTemplateCount > 0;

  const handleNavigate = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    setOpen(false);
  }, []);

  return (
    <UsagePopover
      open={open}
      onOpenChange={setOpen}
      label={label}
      ariaLabel={`Show usage for ${planName}`}
      hasUsage={hasUsage}
      isLoading={isLoading}
      error={error}
    >
      {data ? <UsageList orgId={orgId} usage={data.data} onNavigate={handleNavigate} /> : null}
    </UsagePopover>
  );
}
