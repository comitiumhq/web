import type { JobSummary } from '@comitium/schemas/jobs';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageLoader } from '@comitium/ui/page-loader';
import { RouteNotFound } from '@comitium/ui/route-not-found';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react';
import { createFileRoute, Navigate, Outlet, useLocation } from '@tanstack/react-router';
import { useCallback } from 'react';
import { OrgGuard } from '@/components/auth/org-guard';
import { JobRoutePermissionGuard } from '@/components/auth/route-permission-guard';
import { JobDetailLayout } from '@/components/features/job-detail/job-detail-layout';
import { JobDetailRouteOrgProvider } from '@/components/features/job-detail/job-detail-route-context';
import { DraftFormProvider, useDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftShellActions } from '@/components/features/job-draft/draft-shell-actions';
import { useQueryJobSummary } from '@/hooks/queries/use-query-job-summary';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { isJobPublishing } from '@/lib/jobs/status';
import { Permission } from '@/lib/schemas/org';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId')({
  ssr: false,
  component: JobRouteLayout,
  notFoundComponent: NotFoundJobRoute,
});

function NotFoundJobRoute() {
  return <RouteNotFound />;
}

function JobRouteLayout() {
  const { orgId, jobId } = Route.useParams();
  const { pathname } = useLocation();
  const renderJobRoute = useCallback(
    (org: MyOrg) => <JobRouteShell org={org} jobId={jobId} pathname={pathname} />,
    [jobId, pathname],
  );

  if (isBareJobRoute(pathname, orgId, jobId)) {
    return <RouteNotFound />;
  }

  return <OrgGuard orgId={orgId}>{renderJobRoute}</OrgGuard>;
}

function isBareJobRoute(pathname: string, orgId: string, jobId: string): boolean {
  const basePath = `/org/${orgId}/jobs/${jobId}`;

  return pathname === basePath || pathname === `${basePath}/`;
}

interface JobRouteShellProps {
  org: MyOrg;
  jobId: string;
  pathname: string;
}

function JobRouteShell({ org, jobId, pathname }: JobRouteShellProps) {
  const { data: job, isLoading, error } = useQueryJobSummary(jobId);

  if (isLoading) {
    return (
      <JobDetailRouteOrgProvider org={org}>
        <JobDetailLayout orgId={org.id} jobId={jobId} job={null}>
          <PageLoader />
        </JobDetailLayout>
      </JobDetailRouteOrgProvider>
    );
  }

  if (error || !job) {
    return <RouteNotFound />;
  }

  if (isJobPublishing(job.lifecycle)) {
    return (
      <JobDetailRouteOrgProvider org={org}>
        <JobDetailLayout orgId={org.id} jobId={jobId} job={job}>
          <EmptyState
            icon={PaperPlaneTiltIcon}
            title="Publication submitted"
            description="This role will appear in open jobs when publishing is complete."
            className="min-h-64"
          />
        </JobDetailLayout>
      </JobDetailRouteOrgProvider>
    );
  }

  if (job.status === 'draft') {
    return (
      <JobRoutePermissionGuard permission={Permission.JOB_EDIT} orgId={org.id} jobId={jobId}>
        <DraftFormProvider key={jobId} orgId={org.id} jobId={jobId}>
          <DraftJobShell org={org} jobId={jobId} job={job} />
        </DraftFormProvider>
      </JobRoutePermissionGuard>
    );
  }

  if (isDraftOnlyJobRoute(pathname, org.id, jobId)) {
    return (
      <Navigate
        to="/org/$orgId/jobs/$jobId/pipeline"
        params={{ orgId: org.id, jobId }}
        search={{ tab: 'active' }}
        replace
      />
    );
  }

  return (
    <JobDetailRouteOrgProvider org={org}>
      <JobDetailLayout orgId={org.id} jobId={jobId} job={job}>
        <Outlet />
      </JobDetailLayout>
    </JobDetailRouteOrgProvider>
  );
}

const DRAFT_ONLY_JOB_ROUTE_SUFFIXES = ['details', 'description', 'application-form', 'criteria'] as const;

function isDraftOnlyJobRoute(pathname: string, orgId: string, jobId: string): boolean {
  const basePath = `/org/${orgId}/jobs/${jobId}`;

  return DRAFT_ONLY_JOB_ROUTE_SUFFIXES.some((suffix) => pathname === `${basePath}/${suffix}`);
}

interface DraftJobShellProps {
  org: MyOrg;
  jobId: string;
  job: JobSummary;
}

function DraftJobShell({ org, jobId, job }: DraftJobShellProps) {
  const { stepStatuses } = useDraftFormContext();

  return (
    <JobDetailRouteOrgProvider org={org}>
      <JobDetailLayout
        orgId={org.id}
        jobId={jobId}
        job={job}
        actions={<DraftShellActions lifecycle={job.lifecycle} />}
        draftStepStatuses={stepStatuses}
      >
        <Outlet />
      </JobDetailLayout>
    </JobDetailRouteOrgProvider>
  );
}
