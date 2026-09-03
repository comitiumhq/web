import type { MyApplicationResponse } from '@comitium/schemas/applications';
import { Badge } from '@comitium/ui/badge';
import { Card } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import { CompanyAvatar } from '@comitium/ui/company-avatar';
import { formatDate } from '@comitium/ui/date';
import { formatLocation, formatLocationType } from '@comitium/ui/formatting';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comitium/ui/tooltip';
import { MapPinIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo, useMemo } from 'react';
import { getApplicationStatus, getApplicationStatusDescription } from './utils';

interface ApplicationCardProps {
  app: MyApplicationResponse;
}

export const ApplicationCard = memo(function ApplicationCard({ app }: ApplicationCardProps) {
  const status = getApplicationStatus(app);
  const locationTypeText = formatLocationType(app.job?.locationType);
  const locationText = formatLocation(app.job?.location);
  const statusDescription = getApplicationStatusDescription(app);
  const jobSearch = useMemo(() => {
    if (!app.job?.orgSlug || !app.job.postingSlug) {
      return null;
    }

    return {
      orgSlug: app.job.orgSlug,
      postingSlug: app.job.postingSlug,
    };
  }, [app.job?.orgSlug, app.job?.postingSlug]);

  return (
    <Card className={cn('gap-0 py-0', { 'opacity-70': status.isClosed })}>
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <CompanyAvatar name={app.job?.company?.name} logo={app.job?.company?.logo} />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {app.job?.commitmentStatus === 'published' && jobSearch ? (
                  <Link to="/jobs" search={jobSearch} className="text-heading-16 line-clamp-2 hover:underline">
                    {app.job.title || 'Untitled Job'}
                  </Link>
                ) : (
                  <span className="text-heading-16 line-clamp-2">{app.job?.title || 'Untitled Job'}</span>
                )}

                <div className="flex flex-wrap items-center gap-1.5 text-label-14 text-muted-foreground mt-1">
                  <span className="truncate">{app.job?.company?.name || 'Company'}</span>
                  {locationTypeText && (
                    <>
                      <span>·</span>
                      <span className="shrink-0">{locationTypeText}</span>
                    </>
                  )}
                  {locationText && (
                    <>
                      <span>·</span>
                      <span className="shrink-0 flex items-center gap-0.5">
                        <MapPinIcon className="size-3" />
                        {locationText}
                      </span>
                    </>
                  )}
                </div>

                {app.appliedAt && (
                  <p className="text-label-12 text-muted-foreground mt-2">Applied {formatDate(app.appliedAt)}</p>
                )}
              </div>

              <div className="shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={status.variant}
                        tabIndex={0}
                        aria-label={`${status.label}: ${statusDescription}`}
                        className="cursor-help"
                      >
                        {status.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8} className="text-center">
                      {statusDescription}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
});
