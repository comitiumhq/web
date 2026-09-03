import { Separator } from '@comitium/ui/separator';
import { Link } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import { useCallback, useState } from 'react';

import {
  type StageActivityTemplateKind,
  useQueryStageActivityTemplateUsage,
} from '@/hooks/queries/use-query-stage-activity-template-usage';
import type { StageActivityTemplateUsage } from '@/lib/schemas/stage-activity-template-usage';

import {
  formatJobAndTemplateUsageLabel,
  JOB_TEMPLATE_USAGE_STATUS_LABELS,
  JOB_USAGE_STATUS_LABELS,
  USAGE_LINK_CLASS_NAME,
  UsageEmptyState,
  UsageLinkMeta,
  UsagePopover,
  UsageSectionTitle,
} from './usage-popover';

interface StageActivityTemplateUsagePopoverProps {
  kind: StageActivityTemplateKind;
  orgId: string;
  templateId: string;
  templateName: string;
  jobCount: number;
  jobTemplateCount: number;
}

function UsageList({
  orgId,
  usage,
  onNavigate,
  entityLabel,
}: {
  orgId: string;
  usage: StageActivityTemplateUsage;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
  entityLabel: string;
}) {
  const hasJobs = usage.jobs.length > 0;
  const hasJobTemplates = usage.jobTemplates.length > 0;

  if (!hasJobs && !hasJobTemplates) {
    return <UsageEmptyState>No jobs or job templates use this {entityLabel}.</UsageEmptyState>;
  }

  return (
    <div className="max-h-80 overflow-y-auto p-2">
      {hasJobs ? (
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
              <span className="min-w-0">
                <span className="block truncate text-copy-14">{job.title ?? 'Untitled job'}</span>
                <span className="block truncate text-xs text-muted-foreground">{job.stageNames.join(', ')}</span>
              </span>
              <UsageLinkMeta label={JOB_USAGE_STATUS_LABELS[job.status]} />
            </Link>
          ))}
        </section>
      ) : null}

      {hasJobs && hasJobTemplates ? <Separator className="my-2" /> : null}

      {hasJobTemplates ? (
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
              <span className="min-w-0">
                <span className="block truncate text-copy-14">{template.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{template.stageNames.join(', ')}</span>
              </span>
              <UsageLinkMeta label={JOB_TEMPLATE_USAGE_STATUS_LABELS[template.status]} />
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export function StageActivityTemplateUsagePopover({
  kind,
  orgId,
  templateId,
  templateName,
  jobCount,
  jobTemplateCount,
}: StageActivityTemplateUsagePopoverProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQueryStageActivityTemplateUsage(kind, orgId, templateId, open);
  const label = formatJobAndTemplateUsageLabel(jobCount, jobTemplateCount);
  const hasUsage = jobCount + jobTemplateCount > 0;
  const entityLabel = kind === 'interview' ? 'interview template' : 'email template';

  const handleNavigate = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    setOpen(false);
  }, []);

  return (
    <UsagePopover
      open={open}
      onOpenChange={setOpen}
      label={label}
      ariaLabel={`Show usage for ${templateName}`}
      hasUsage={hasUsage}
      isLoading={isLoading}
      error={error}
    >
      {data ? (
        <UsageList orgId={orgId} usage={data.data} onNavigate={handleNavigate} entityLabel={entityLabel} />
      ) : null}
    </UsagePopover>
  );
}
