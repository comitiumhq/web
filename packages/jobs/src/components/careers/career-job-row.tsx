import { Badge } from '@comitium/ui/badge';
import { cn } from '@comitium/ui/cn';
import { formatRelativeTime } from '@comitium/ui/date';
import { formatEmploymentType, formatLocation, formatLocationType } from '@comitium/ui/formatting';
import { formatCompensationCompact } from '@comitium/ui/salary';
import { BriefcaseIcon, CaretRightIcon, MapPinIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import type { CareerJobListItem } from '../../schemas/careers';

interface CareerJobRowProps {
  job: CareerJobListItem;
  isLast?: boolean;
}

const ROW_BADGE_CLASS = 'h-6 px-2 text-label-12 font-normal';
const ROW_VALUE_BADGE_CLASS = 'h-6 px-2 text-label-12 font-medium tabular-nums';

export const CareerJobRow = memo(function CareerJobRow({ job, isLast }: CareerJobRowProps) {
  const locationTypeText = formatLocationType(job.locationType);
  const locationText = formatLocation(job.location);
  const salary = formatCompensationCompact(job.compensation);

  return (
    <Link
      to={job.canonicalUrl}
      className={cn(
        'group block min-h-30 border-b border-border px-4 py-4 transition-colors duration-150 hover:bg-muted sm:px-5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        { 'border-b-0': isLast },
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <h2 className="min-w-0 text-heading-16">{job.title || 'Untitled Position'}</h2>
            <span className="shrink-0 text-label-12 text-muted-foreground">{formatRelativeTime(job.createdAt)}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {locationTypeText && (
              <Badge variant="outline" className={ROW_BADGE_CLASS}>
                {locationTypeText}
              </Badge>
            )}
            {locationText && (
              <Badge variant="outline" className={ROW_BADGE_CLASS}>
                <MapPinIcon data-icon="inline-start" />
                {locationText}
              </Badge>
            )}
            {job.employmentType && (
              <Badge variant="outline" className={ROW_BADGE_CLASS}>
                <BriefcaseIcon data-icon="inline-start" />
                {formatEmploymentType(job.employmentType)}
              </Badge>
            )}
          </div>

          {salary && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={ROW_VALUE_BADGE_CLASS}>
                {salary}
              </Badge>
            </div>
          )}
        </div>

        <CaretRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
});
