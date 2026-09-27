import type { JobSummary } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { Skeleton } from '@comitium/ui/skeleton';
import type { Icon } from '@phosphor-icons/react';
import { ArrowLeftIcon, KanbanIcon } from '@phosphor-icons/react';
import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { DRAFT_SECTIONS } from '@/components/features/job-draft/sections';
import type { StepStatus } from '@/components/features/job-draft/utils';
import {
  EvaluationCriteriaIcon,
  InterviewPlanIcon,
  JobPostingIcon,
  JobSettingsIcon,
} from '@/lib/constants/domain-icons';
import { cn } from '@/lib/utils';
import { JobLifecycleInfoBar } from './job-lifecycle-info-bar';
import { JobLifecycleMenu } from './job-lifecycle-menu';
import { JobMoreMenu } from './job-more-menu';

interface JobDetailLayoutProps {
  orgId: string;
  jobId: string;
  job: JobSummary | null;
  actions?: ReactNode;
  draftStepStatuses?: StepStatus[];
  showNavigationSkeleton?: boolean;
  lifecycleActionsDisabled?: boolean;
  children: ReactNode;
}

export function JobDetailLayout({
  orgId,
  jobId,
  job,
  actions,
  draftStepStatuses,
  showNavigationSkeleton = false,
  lifecycleActionsDisabled = false,
  children,
}: JobDetailLayoutProps) {
  const { pathname } = useLocation();
  const showNav = job !== null || showNavigationSkeleton;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <JobDetailHeaderBar
        orgId={orgId}
        job={job}
        actions={actions}
        lifecycleActionsDisabled={lifecycleActionsDisabled}
      />

      {showNav &&
        (job ? (
          <JobNav
            orgId={orgId}
            jobId={jobId}
            job={job}
            pathname={pathname}
            orientation="horizontal"
            draftStepStatuses={draftStepStatuses}
          />
        ) : (
          <JobNavSkeleton orientation="horizontal" />
        ))}

      <div className="flex min-h-0 flex-1">
        {showNav && (
          <aside className="hidden w-56 shrink-0 border-r border-separator p-3 md:block">
            {job ? (
              <JobNav
                orgId={orgId}
                jobId={jobId}
                job={job}
                pathname={pathname}
                orientation="vertical"
                draftStepStatuses={draftStepStatuses}
              />
            ) : (
              <JobNavSkeleton orientation="vertical" />
            )}
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

const JOB_NAV_SKELETON_KEYS = ['nav-1', 'nav-2', 'nav-3', 'nav-4'];

function JobNavSkeleton({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  const containerClassName =
    orientation === 'vertical'
      ? 'flex flex-col gap-1'
      : 'flex items-center gap-1 overflow-hidden border-b border-separator px-4 py-2 md:hidden';

  return (
    <div aria-hidden="true" className={containerClassName}>
      {JOB_NAV_SKELETON_KEYS.map((key) => (
        <div key={key} className="flex h-9 shrink-0 items-center gap-2.5 px-3">
          <Skeleton className="size-4 shrink-0 rounded-md" />
          <Skeleton className="h-3.5 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}

interface JobDetailHeaderBarProps {
  orgId: string;
  job: JobSummary | null;
  actions?: ReactNode;
  lifecycleActionsDisabled: boolean;
}

function JobDetailHeaderBar({ orgId, job, actions, lifecycleActionsDisabled }: JobDetailHeaderBarProps) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-separator px-4 py-2 sm:px-6">
      <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
        <Link to="/org/$orgId/jobs" params={{ orgId }} search={{ status: 'all' }} aria-label="Back to jobs">
          <ArrowLeftIcon />
        </Link>
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {job ? <h1 className="truncate text-heading-16">{getJobTitle(job)}</h1> : <HeaderTitleSkeleton />}
        {job && <JobLifecycleMenu job={job} orgId={orgId} actionsDisabled={lifecycleActionsDisabled} />}
      </div>

      {job && (
        <div className="flex shrink-0 items-center gap-1">{actions ?? <JobMoreMenu job={job} orgId={orgId} />}</div>
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

type JobNavRoute =
  | '/org/$orgId/jobs/$jobId/pipeline'
  | '/org/$orgId/jobs/$jobId/posting'
  | '/org/$orgId/jobs/$jobId/settings'
  | (typeof DRAFT_SECTIONS)[number]['route'];

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
      : 'flex items-center gap-1 overflow-x-auto border-b border-separator px-4 py-2 scrollbar-hide md:hidden';

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

  const commonItems: JobNavItem[] = [
    {
      label: 'Pipeline',
      icon: KanbanIcon,
      to: '/org/$orgId/jobs/$jobId/pipeline',
      search: { tab: 'active' },
      isActive: (pathname) => pathname.includes('/pipeline'),
    },
  ];

  return [
    ...commonItems,
    {
      label: 'Settings',
      icon: JobSettingsIcon,
      to: '/org/$orgId/jobs/$jobId/settings',
      isActive: (pathname) => pathname.endsWith('/settings'),
    },
    {
      label: 'Interview plan',
      icon: InterviewPlanIcon,
      to: '/org/$orgId/jobs/$jobId/interview-plan',
      isActive: (pathname) => pathname.includes('/interview-plan'),
    },
    {
      label: 'Evaluation criteria',
      icon: EvaluationCriteriaIcon,
      to: '/org/$orgId/jobs/$jobId/criteria',
      isActive: (pathname) => pathname.endsWith('/criteria'),
    },
    {
      label: 'Posting',
      icon: JobPostingIcon,
      to: '/org/$orgId/jobs/$jobId/posting',
      isActive: (pathname) => pathname.endsWith('/posting'),
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
  return job.title ?? 'Untitled role';
}

function HeaderTitleSkeleton() {
  return <div className="h-5 w-44 animate-pulse rounded-md bg-muted" />;
}
