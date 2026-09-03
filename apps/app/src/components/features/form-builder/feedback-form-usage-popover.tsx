import type { FeedbackFormUsage } from '@comitium/schemas/forms/form-definitions';
import { Separator } from '@comitium/ui/separator';
import { Link } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import { useCallback, useState } from 'react';

import { useQueryFeedbackFormUsage } from '@/hooks/queries/use-query-feedback-form-usage';

import {
  formatUsageCount,
  JOB_TEMPLATE_USAGE_STATUS_LABELS,
  JOB_USAGE_STATUS_LABELS,
  USAGE_LINK_CLASS_NAME,
  UsageLinkMeta,
  UsagePopover,
  UsageSectionTitle,
} from '../settings-library/usage-popover';

interface FeedbackFormUsagePopoverProps {
  orgId: string;
  formId: string;
  formTitle: string;
  jobActivityCount: number;
  jobTemplateActivityCount: number;
  interviewTemplateCount: number;
}

function formatFeedbackFormUsageLabel(
  jobActivityCount: number,
  jobTemplateActivityCount: number,
  interviewTemplateCount: number,
) {
  const total = jobActivityCount + jobTemplateActivityCount + interviewTemplateCount;

  return total > 0 ? formatUsageCount(total, 'use') : 'Not used';
}

export function formatFeedbackFormArchiveImpact(
  jobActivityCount: number,
  jobTemplateActivityCount: number,
  interviewTemplateCount: number,
) {
  const reviewActivityCount = jobActivityCount + jobTemplateActivityCount;
  const parts: string[] = [];

  if (reviewActivityCount > 0) {
    parts.push(formatUsageCount(reviewActivityCount, 'review activity'));
  }

  if (interviewTemplateCount > 0) {
    parts.push(formatUsageCount(interviewTemplateCount, 'interview template'));
  }

  if (parts.length === 0) {
    return null;
  }

  return `${parts.join(' and ')} will keep using it until switched.`;
}

interface UsageListProps {
  orgId: string;
  usage: FeedbackFormUsage;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}

function UsageList({ orgId, usage, onNavigate }: UsageListProps) {
  const hasJobs = usage.jobActivities.length > 0;
  const hasJobTemplates = usage.jobTemplateActivities.length > 0;
  const hasInterviewTemplates = usage.interviewTemplates.length > 0;

  return (
    <div className="max-h-80 overflow-y-auto p-2">
      {hasJobs && (
        <section>
          <UsageSectionTitle label="Jobs" count={usage.jobActivities.length} />
          {usage.jobActivities.map((item) => (
            <Link
              key={item.activityId}
              to="/org/$orgId/jobs/$jobId/interview-plan"
              params={{ orgId, jobId: item.jobId }}
              className={USAGE_LINK_CLASS_NAME}
              onClick={onNavigate}
            >
              <span className="min-w-0">
                <span className="block truncate text-copy-14">{item.jobTitle ?? 'Untitled job'}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.stageName}</span>
              </span>
              <UsageLinkMeta label={JOB_USAGE_STATUS_LABELS[item.jobStatus]} />
            </Link>
          ))}
        </section>
      )}

      {hasJobs && (hasJobTemplates || hasInterviewTemplates) && <Separator className="my-2" />}

      {hasJobTemplates && (
        <section>
          <UsageSectionTitle label="Job templates" count={usage.jobTemplateActivities.length} />
          {usage.jobTemplateActivities.map((item) => (
            <Link
              key={item.activityId}
              to="/org/$orgId/organization/job-templates"
              params={{ orgId }}
              search={{ templateId: item.jobTemplateId }}
              className={USAGE_LINK_CLASS_NAME}
              onClick={onNavigate}
            >
              <span className="min-w-0">
                <span className="block truncate text-copy-14">{item.jobTemplateTitle}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.stageName}</span>
              </span>
              <UsageLinkMeta label={JOB_TEMPLATE_USAGE_STATUS_LABELS[item.jobTemplateStatus]} />
            </Link>
          ))}
        </section>
      )}

      {hasJobTemplates && hasInterviewTemplates && <Separator className="my-2" />}

      {hasInterviewTemplates && (
        <section>
          <UsageSectionTitle label="Interview templates" count={usage.interviewTemplates.length} />
          {usage.interviewTemplates.map((item) => (
            <Link
              key={item.id}
              to="/org/$orgId/organization/interviews"
              params={{ orgId }}
              search={{ templateId: item.id }}
              className={USAGE_LINK_CLASS_NAME}
              onClick={onNavigate}
            >
              <span className="min-w-0 truncate text-copy-14">{item.title}</span>
              <UsageLinkMeta label={item.isArchived ? 'Archived' : 'Active'} />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}

export function FeedbackFormUsagePopover({
  orgId,
  formId,
  formTitle,
  jobActivityCount,
  jobTemplateActivityCount,
  interviewTemplateCount,
}: FeedbackFormUsagePopoverProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQueryFeedbackFormUsage(orgId, formId, open);
  const label = formatFeedbackFormUsageLabel(jobActivityCount, jobTemplateActivityCount, interviewTemplateCount);
  const hasUsage = jobActivityCount + jobTemplateActivityCount + interviewTemplateCount > 0;

  const handleNavigate = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    setOpen(false);
  }, []);

  return (
    <UsagePopover
      open={open}
      onOpenChange={setOpen}
      label={label}
      ariaLabel={`Show usage for ${formTitle}`}
      hasUsage={hasUsage}
      isLoading={isLoading}
      error={error}
    >
      {data ? <UsageList orgId={orgId} usage={data.data} onNavigate={handleNavigate} /> : null}
    </UsagePopover>
  );
}
