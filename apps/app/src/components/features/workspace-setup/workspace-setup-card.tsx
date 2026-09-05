import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@comitium/ui/collapsible';
import { Progress } from '@comitium/ui/progress';
import { Separator } from '@comitium/ui/separator';
import { Skeleton } from '@comitium/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { ArrowRightIcon, CaretDownIcon, CheckCircleIcon, CircleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';
import type { WorkspaceSetup } from '@/lib/schemas/org';
import { cn } from '@/lib/utils';
import { isJobCreationAllowedBySetup } from '@/lib/workspace-setup';

interface WorkspaceSetupCardProps {
  orgId: string;
  setup: WorkspaceSetup;
}

const WORKSPACE_SETUP_OPEN_STORAGE_PREFIX = 'comitium:workspace-setup:open';

export function WorkspaceSetupCard({ orgId, setup }: WorkspaceSetupCardProps) {
  const storageKey = `${WORKSPACE_SETUP_OPEN_STORAGE_PREFIX}:${orgId}`;
  const [open, setOpen] = useState(() => globalThis.localStorage?.getItem(storageKey) !== 'false');
  const progress = (setup.completedRequired / setup.requiredTotal) * 100;
  const jobCreationAvailable = isJobCreationAllowedBySetup(setup);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    globalThis.localStorage?.setItem(storageKey, String(nextOpen));
  };

  return (
    <Card
      size="sm"
      className={cn(
        'max-h-[calc(100dvh-2rem)] min-w-0 max-w-[calc(100vw-2rem)] gap-0 bg-popover/90 py-0 shadow-lg backdrop-blur-2xl transition-[width]! [transition-duration:200ms]! ease-[cubic-bezier(0.4,0,0.2,1)]! supports-[backdrop-filter]:bg-popover/60 motion-reduce:transition-none!',
        open ? 'w-72' : 'w-64',
      )}
    >
      <Collapsible open={open} onOpenChange={handleOpenChange} className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0 gap-0 px-4 py-3">
          <CollapsibleTrigger className="group grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <CardTitle className="truncate whitespace-nowrap text-heading-14">Getting started</CardTitle>
            <span className="whitespace-nowrap text-label-12 text-muted-foreground tabular-nums">
              {setup.completedRequired}/{setup.requiredTotal}
            </span>
            <CaretDownIcon
              aria-hidden="true"
              className={cn(
                'size-4 text-muted-foreground transition-transform! [transition-duration:200ms]! ease-[cubic-bezier(0.4,0,0.2,1)]! motion-reduce:transition-none!',
                { 'rotate-180': open },
              )}
            />
          </CollapsibleTrigger>

          <Progress
            value={progress}
            className="mt-2 h-1.5"
            aria-label={`${setup.completedRequired} of ${setup.requiredTotal} getting started steps complete`}
            aria-valuenow={progress}
          />
        </CardHeader>

        <CollapsibleContent className="min-h-0 w-full overflow-hidden [--radix-accordion-content-height:var(--radix-collapsible-content-height)] [animation-duration:200ms]! [animation-timing-function:cubic-bezier(0.4,0,0.2,1)]! data-closed:animate-accordion-up data-open:flex-1 data-open:animate-accordion-down data-open:overflow-y-auto data-open:overscroll-contain motion-reduce:animate-none!">
          <CardContent className="flex w-full flex-col gap-3 px-4 pt-1 pb-4">
            <div className="flex flex-col gap-1">
              <Link
                to="/org/$orgId/organization/company"
                params={{ orgId }}
                aria-label={setupRowAriaLabel('Add company details', setup.required.companyDetails.complete)}
                className={setupRowClassName(setup.required.companyDetails.complete)}
              >
                <SetupRowContent complete={setup.required.companyDetails.complete}>Add company details</SetupRowContent>
              </Link>
              <Link
                to="/org/$orgId/organization/departments"
                params={{ orgId }}
                aria-label={setupRowAriaLabel('Add a department', setup.required.department.complete)}
                className={setupRowClassName(setup.required.department.complete)}
              >
                <SetupRowContent complete={setup.required.department.complete}>Add a department</SetupRowContent>
              </Link>
              <Link
                to="/org/$orgId/organization/locations"
                params={{ orgId }}
                aria-label={setupRowAriaLabel('Add a location', setup.required.location.complete)}
                className={setupRowClassName(setup.required.location.complete)}
              >
                <SetupRowContent complete={setup.required.location.complete}>Add a location</SetupRowContent>
              </Link>
              <Link
                to="/org/$orgId/organization/data-privacy"
                params={{ orgId }}
                aria-label={setupRowAriaLabel(
                  'Add recruiting privacy policy',
                  setup.required.recruitingPrivacy.complete,
                )}
                className={setupRowClassName(setup.required.recruitingPrivacy.complete)}
              >
                <SetupRowContent complete={setup.required.recruitingPrivacy.complete}>
                  Add recruiting privacy policy
                </SetupRowContent>
              </Link>
              {jobCreationAvailable ? (
                <Link
                  to="/org/$orgId/jobs"
                  params={{ orgId }}
                  search={{ status: 'all', create: true }}
                  aria-label={setupRowAriaLabel('Create your first job', setup.required.firstJob.complete)}
                  className={setupRowClassName(setup.required.firstJob.complete)}
                >
                  <SetupRowContent complete={setup.required.firstJob.complete}>Create your first job</SetupRowContent>
                </Link>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-disabled="true"
                      aria-label="Unavailable: Create your first job. Complete the setup steps above first."
                      className={setupRowClassName(false, true)}
                    >
                      <SetupRowContent complete={false} showAction={false}>
                        Create your first job
                      </SetupRowContent>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Complete the steps above to create a job.</TooltipContent>
                </Tooltip>
              )}
            </div>

            <Separator />

            <div>
              <p className="px-2 pb-1 text-label-12 text-muted-foreground">Optional</p>
              <Link
                to="/org/$orgId/organization/members"
                params={{ orgId }}
                aria-label={setupRowAriaLabel('Invite a member', setup.recommended.inviteTeammate.complete)}
                className={setupRowClassName(setup.recommended.inviteTeammate.complete)}
              >
                <SetupRowContent complete={setup.recommended.inviteTeammate.complete}>
                  Invite a member
                </SetupRowContent>
              </Link>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function WorkspaceSetupCardSkeleton() {
  return (
    <Card
      size="sm"
      className="max-h-[calc(100dvh-2rem)] w-72 max-w-[calc(100vw-2rem)] min-w-0 gap-0 bg-popover/90 py-0 shadow-lg backdrop-blur-2xl supports-[backdrop-filter]:bg-popover/60"
      aria-label="Loading getting started"
    >
      <CardHeader className="shrink-0 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-8" />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-1 pb-4">
        <Skeleton className="h-1.5 w-full rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Separator />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function SetupRowContent({
  children,
  complete,
  showAction = true,
}: {
  children: ReactNode;
  complete: boolean;
  showAction?: boolean;
}) {
  const StatusIcon = complete ? CheckCircleIcon : CircleIcon;

  return (
    <>
      <StatusIcon
        aria-hidden="true"
        weight={complete ? 'fill' : 'regular'}
        className={cn('size-4 shrink-0', complete ? 'text-success' : 'text-muted-foreground')}
      />
      <span className={cn('min-w-0 flex-1 leading-5', { 'text-muted-foreground': complete })}>{children}</span>
      {!complete && showAction && (
        <ArrowRightIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      )}
    </>
  );
}

function setupRowAriaLabel(label: string, complete: boolean): string {
  return `${complete ? 'Complete' : 'Incomplete'}: ${label}`;
}

function setupRowClassName(complete: boolean, disabled = false): string {
  return cn(
    'group flex min-h-10 w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-label-14 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
    {
      'text-muted-foreground': complete,
      'cursor-not-allowed opacity-50 hover:bg-transparent': disabled,
    },
  );
}
