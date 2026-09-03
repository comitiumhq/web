import type { ApplicationFormUsage } from '@comitium/schemas/forms/form-definitions';
import { Separator } from '@comitium/ui/separator';
import { Link } from '@tanstack/react-router';
import type { MouseEvent } from 'react';
import { useCallback, useState } from 'react';

import { useQueryApplicationFormUsage } from '@/hooks/queries/use-query-application-form-usage';

import {
  formatJobAndTemplateArchiveImpact,
  formatJobAndTemplateUsageLabel,
  JOB_TEMPLATE_USAGE_STATUS_LABELS,
  JOB_USAGE_STATUS_LABELS,
  USAGE_LINK_CLASS_NAME,
  UsageEmptyState,
  UsageLinkMeta,
  UsagePopover,
  UsageSectionTitle,
} from '../settings-library/usage-popover';

interface ApplicationFormUsagePopoverProps {
  orgId: string;
  formId: string;
  formTitle: string;
  jobCount: number;
  jobTemplateCount: number;
}

type ApplicationFormUsageJob = ApplicationFormUsage['jobs'][number];

function JobUsageLink({
  orgId,
  job,
  onNavigate,
}: {
  orgId: string;
  job: ApplicationFormUsageJob;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const content = (
    <>
      <span className="min-w-0 truncate text-copy-14">{job.title ?? 'Untitled job'}</span>
      <UsageLinkMeta label={JOB_USAGE_STATUS_LABELS[job.status]} />
    </>
  );

  if (job.status === 'draft') {
    return (
      <Link
        to="/org/$orgId/jobs/$jobId/application-form"
        params={{ orgId, jobId: job.id }}
        className={USAGE_LINK_CLASS_NAME}
        onClick={onNavigate}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      to="/org/$orgId/jobs/$jobId/pipeline"
      params={{ orgId, jobId: job.id }}
      search={{ tab: 'active' }}
      className={USAGE_LINK_CLASS_NAME}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

function UsageList({
  orgId,
  usage,
  onNavigate,
}: {
  orgId: string;
  usage: ApplicationFormUsage;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const hasJobs = usage.jobs.length > 0;
  const hasJobTemplates = usage.jobTemplates.length > 0;

  if (!hasJobs && !hasJobTemplates) {
    return <UsageEmptyState>No jobs or job templates use this form.</UsageEmptyState>;
  }

  return (
    <div className="max-h-80 overflow-y-auto p-2">
      {hasJobs ? (
        <section>
          <UsageSectionTitle label="Jobs" count={usage.jobs.length} />
          {usage.jobs.map((job) => (
            <JobUsageLink key={job.id} orgId={orgId} job={job} onNavigate={onNavigate} />
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
              <span className="min-w-0 truncate text-copy-14">{template.title}</span>
              <UsageLinkMeta label={JOB_TEMPLATE_USAGE_STATUS_LABELS[template.status]} />
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export function ApplicationFormUsagePopover({
  orgId,
  formId,
  formTitle,
  jobCount,
  jobTemplateCount,
}: ApplicationFormUsagePopoverProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQueryApplicationFormUsage(orgId, formId, open);
  const label = formatJobAndTemplateUsageLabel(jobCount, jobTemplateCount);
  const hasUsage = jobCount + jobTemplateCount > 0;

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

export function formatApplicationFormArchiveImpact(jobCount: number, jobTemplateCount: number) {
  return formatJobAndTemplateArchiveImpact(jobCount, jobTemplateCount);
}
