import type { Job } from '@comitium/schemas/public-jobs';
import { Badge } from '@comitium/ui/badge';
import { formatEmploymentType, formatLocation, formatLocationType } from '@comitium/ui/formatting';
import { formatCompensationSalary, hasCompensation } from '@comitium/ui/salary';
import { ScrollArea } from '@comitium/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { BriefcaseIcon, ClockIcon, MapPinIcon } from '@phosphor-icons/react';
import { getPublicApplicationAvailability } from '../../../application/availability';
import { formatResponseWindow } from '../metadata-labels';
import { JobActions } from './actions';
import { ApplyButton } from './apply-button';
import { JobCompany } from './company';
import { JobDescription } from './description';

interface JobDetailProps {
  job: JobDetailData;
  careersUrl?: string | null;
  applyUrl?: string | null;
}

type JobDetailData = Pick<
  Job,
  | 'id'
  | 'applyMode'
  | 'applicationCapacityAvailable'
  | 'responseDeadlineDays'
  | 'status'
  | 'txHash'
  | 'canonicalUrl'
  | 'title'
  | 'description'
  | 'location'
  | 'employmentType'
  | 'locationType'
  | 'compensation'
  | 'companyInfo'
>;

const JOB_FACT_BADGE_CLASS = 'h-6 px-2 text-label-12 font-normal';
const JOB_FACT_VALUE_BADGE_CLASS = 'h-6 px-2 text-label-12 font-medium tabular-nums';

export function JobDetail({ job, careersUrl = null, applyUrl = null }: JobDetailProps) {
  const locationTypeText = formatLocationType(job.locationType);
  const locationText = formatLocation(job.location);
  const salary = hasCompensation(job.compensation) ? formatCompensationSalary(job.compensation) : null;
  const applicationAvailability = getPublicApplicationAvailability(job);
  const canApply = applicationAvailability === 'accepting' && applyUrl !== null;
  const responseWindow = job.responseDeadlineDays === null ? null : formatResponseWindow(job.responseDeadlineDays);
  const responseWindowLabel = responseWindow ? `${responseWindow} to respond` : null;

  return (
    <div className="flex flex-col overflow-hidden lg:h-full">
      <div className="shrink-0 border-b border-border px-5 py-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-heading-26 min-w-0 flex-1">{job.title || 'Untitled Position'}</h2>
          <div className="flex shrink-0 items-center gap-2">
            {canApply && (
              <div className="hidden lg:block">
                <ApplyButton applyUrl={applyUrl} size="default" />
              </div>
            )}
            <JobActions jobUrl={job.canonicalUrl} txHash={job.txHash} />
          </div>
        </div>

        <div className="mb-3">
          <JobCompany companyInfo={job.companyInfo} href={careersUrl} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {salary && (
            <Badge variant="outline" className={JOB_FACT_VALUE_BADGE_CLASS}>
              {salary}
            </Badge>
          )}
          {locationTypeText && (
            <Badge variant="outline" className={JOB_FACT_BADGE_CLASS}>
              {locationTypeText}
            </Badge>
          )}
          {locationText && (
            <Badge variant="outline" className={JOB_FACT_BADGE_CLASS}>
              <MapPinIcon data-icon="inline-start" />
              {locationText}
            </Badge>
          )}
          {job.employmentType && (
            <Badge variant="outline" className={JOB_FACT_BADGE_CLASS}>
              <BriefcaseIcon data-icon="inline-start" />
              {formatEmploymentType(job.employmentType)}
            </Badge>
          )}
          {responseWindow && responseWindowLabel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={JOB_FACT_VALUE_BADGE_CLASS} aria-label={responseWindowLabel}>
                  <ClockIcon data-icon="inline-start" />
                  {responseWindow}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{responseWindowLabel}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="flex flex-col gap-6 px-5 py-5">
          {job.description && <JobDescription description={job.description} />}
        </div>
      </ScrollArea>

      {canApply && (
        <div className="lg:hidden shrink-0 px-4 py-3 border-t border-border bg-background">
          <ApplyButton applyUrl={applyUrl} size="default" fullWidth />
        </div>
      )}
    </div>
  );
}
