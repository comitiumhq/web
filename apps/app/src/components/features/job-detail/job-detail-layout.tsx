import type { JobSummary } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import type { Icon } from '@phosphor-icons/react';
import { ArrowLeftIcon, KanbanIcon } from '@phosphor-icons/react';
import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { DRAFT_SECTIONS } from '@/components/features/job-draft/sections';
import type { StepStatus } from '@/components/features/job-draft/utils';
import { HiringTeamIcon, InterviewPlanIcon } from '@/lib/constants/domain-icons';
import { cn } from '@/lib/utils';

import { JobActionButton } from './job-action-button';
import { JobLifecycleInfoBar } from './job-lifecycle-info-bar';
import { JobMoreMenu } from './job-more-menu';
import { JobStatusBadge } from './job-status-badge';

interface JobDetailLayoutProps {
  orgId: string;
  jobId: string;
  job: JobSummary | null;
  actions?: ReactNode;
  draftStepStatuses?: StepStatus[];
  children: ReactNode;
}

export function JobDetailLayout({ orgId, jobId, job, actions, draftStepStatuses, children }: JobDetailLayoutProps) {
  const { pathname } = useLocation();
  const showNav = job !== null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <JobDetailHeaderBar orgId={orgId} job={job} actions={actions} />

      {showNav && (
        <JobNav
          orgId={orgId}
          jobId={jobId}
          job={job}
          pathname={pathname}
          orientation="horizontal"
          draftStepStatuses={draftStepStatuses}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {showNav && (
          <aside className="hidden w-56 shrink-0 border-r border-border p-3 md:block">
            <JobNav
              orgId={orgId}
              jobId={jobId}
              job={job}
              pathname={pathname}
              orientation="vertical"
              draftStepStatuses={draftStepStatuses}
            />
          </aside>
        )}

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {job && <JobLifecycleInfoBar status={job.status} lifecycle={job.lifecycle} />}
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
}

interface JobDetailHeaderBarProps {
  orgId: string;
  job: JobSummary | null;
  actions?: ReactNode;
}

function JobDetailHeaderBar({ orgId, job, actions }: JobDetailHeaderBarProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2 sm:px-6">
      <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
        <Link to="/org/$orgId/jobs" params={{ orgId }} search={{ status: 'all' }} aria-label="Back to jobs">
          <ArrowLeftIcon />
        </Link>
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {job ? <h1 className="truncate text-heading-16">{getJobTitle(job)}</h1> : <HeaderTitleSkeleton />}
        {job && <JobStatusBadge status={job.status} />}
      </div>

      {job && (
        <div className="flex shrink-0 items-center gap-1">
          {actions ?? (
            <>
              <JobActionButton job={job} orgId={orgId} />
              <JobMoreMenu job={job} orgId={orgId} />
            </>
          )}
        </div>
      )}
    </header>
  );
}

interface JobNavProps {
  orgId: string;
  jobId: string;
  job: JobSummary | null;
  pathname: string;
  orientation: 'vertical' | 'horizontal';
  draftStepStatuses?: StepStatus[];
}

type JobNavRoute = '/org/$orgId/jobs/$jobId/pipeline' | (typeof DRAFT_SECTIONS)[number]['route'];

interface JobNavItem {
  label: string;
  icon: Icon;
  to: JobNavRoute;
  search?: Record<string, string>;
  isActive: (pathname: string) => boolean;
  status?: StepStatus;
}

function JobNav({ orgId, jobId, job, pathname, orientation, draftStepStatuses }: JobNavProps) {
  const navItems = getJobNavItems(job, draftStepStatuses);

  const containerClassName =
    orientation === 'vertical'
      ? 'flex flex-col gap-1'
      : 'flex items-center gap-1 overflow-x-auto border-b border-border px-4 py-2 scrollbar-hide md:hidden';

  return (
    <nav className={containerClassName}>
      {navItems.map((item) => (
        <JobNavLink key={item.to} item={item} orgId={orgId} jobId={jobId} pathname={pathname} />
      ))}
    </nav>
  );
}

function getJobNavItems(job: JobSummary | null, draftStepStatuses?: StepStatus[]): JobNavItem[] {
  if (job?.status === 'draft') {
    return DRAFT_SECTIONS.map((section, index) => ({
      label: section.label,
      icon: section.icon,
      to: section.route,
      status: draftStepStatuses?.[index],
      isActive: (pathname) => pathname.endsWith(`/${section.id}`),
    }));
  }

  return [
    {
      label: 'Pipeline',
      icon: KanbanIcon,
      to: '/org/$orgId/jobs/$jobId/pipeline',
      search: { tab: 'active' },
      isActive: (pathname) => pathname.includes('/pipeline'),
    },
    {
      label: 'Interview plan',
      icon: InterviewPlanIcon,
      to: '/org/$orgId/jobs/$jobId/interview-plan',
      isActive: (pathname) => pathname.includes('/interview-plan'),
    },
    {
      label: 'Hiring team',
      icon: HiringTeamIcon,
      to: '/org/$orgId/jobs/$jobId/hiring-team',
      isActive: (pathname) => pathname.endsWith('/hiring-team'),
    },
  ];
}

interface JobNavLinkProps {
  item: JobNavItem;
  orgId: string;
  jobId: string;
  pathname: string;
}

function JobNavLink({ item, orgId, jobId, pathname }: JobNavLinkProps) {
  const Icon = item.icon;
  const active = item.isActive(pathname);

  return (
    <Link to={item.to} params={{ orgId, jobId }} search={item.search} className={jobNavLinkClass(active)}>
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.status === 'error' && (
        <span className="ml-auto flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-label-11 text-destructive">
          !
        </span>
      )}
    </Link>
  );
}

function jobNavLinkClass(active: boolean): string {
  return cn(
    'flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-label-14 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
    {
      'bg-accent text-accent-foreground': active,
      'text-muted-foreground hover:bg-accent hover:text-foreground': !active,
    },
  );
}

function getJobTitle(job: JobSummary): string {
  return job.title ?? `Job #${job.jobId}`;
}

function HeaderTitleSkeleton() {
  return <div className="h-5 w-44 animate-pulse rounded-md bg-muted" />;
}
