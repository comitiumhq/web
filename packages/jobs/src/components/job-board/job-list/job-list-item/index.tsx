import type { JobListItem as JobListItemType } from '@comitium/schemas/public-jobs';
import { Badge } from '@comitium/ui/badge';
import { cn } from '@comitium/ui/cn';
import { CompanyAvatar } from '@comitium/ui/company-avatar';
import { formatRelativeTime } from '@comitium/ui/date';
import { formatEmploymentType, formatLocation, formatLocationType } from '@comitium/ui/formatting';
import { formatCompensationCompact } from '@comitium/ui/salary';
import { BriefcaseIcon, MapPinIcon } from '@phosphor-icons/react';

interface JobListItemProps {
  job: JobListItemType;
  isSelected: boolean;
  isLast?: boolean;
  onClick: () => void;
}

const LIST_BADGE_CLASS = 'h-6 px-2 text-label-12 font-normal';
const LIST_VALUE_BADGE_CLASS = 'h-6 px-2 text-label-12 font-medium tabular-nums';

export function JobListItem({ job, isSelected, isLast, onClick }: JobListItemProps) {
  const timeAgo = formatRelativeTime(job.createdAt);
  const locationTypeText = formatLocationType(job.locationType);
  const locationText = formatLocation(job.location);
  const salary = formatCompensationCompact(job.compensation);
  const companyName = job.companyInfo?.name || 'Company';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        'block min-h-[9.25rem] w-full border-b border-border px-4 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        {
          'bg-muted': isSelected,
          'border-b-0': isLast,
          'hover:bg-muted': !isSelected,
        },
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyAvatar
          name={job.companyInfo?.name}
          logo={job.companyInfo?.logo}
          size="sm"
          className="mt-0.5"
          decorative
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <div className="text-heading-16">{job.title || 'Untitled Position'}</div>
            </div>
            <span className="text-label-12 text-muted-foreground shrink-0">{timeAgo}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-label-14 text-foreground">{companyName}</span>
            {locationTypeText && (
              <Badge variant="outline" className={LIST_BADGE_CLASS}>
                {locationTypeText}
              </Badge>
            )}
            {locationText && (
              <Badge variant="outline" className={LIST_BADGE_CLASS}>
                <MapPinIcon data-icon="inline-start" />
                {locationText}
              </Badge>
            )}
            {job.employmentType && (
              <Badge variant="outline" className={LIST_BADGE_CLASS}>
                <BriefcaseIcon data-icon="inline-start" />
                {formatEmploymentType(job.employmentType)}
              </Badge>
            )}
          </div>

          {salary && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={LIST_VALUE_BADGE_CLASS}>
                {salary}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
