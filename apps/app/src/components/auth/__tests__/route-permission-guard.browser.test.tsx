import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { Permission } from '@/lib/schemas/org';
import { JobRoutePermissionGuard, RoutePermissionGuard } from '../route-permission-guard';

const mocks = vi.hoisted(() => ({
  can: false,
  canOnJob: false,
  isJobLoading: false,
  isLoading: false,
  navigate: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    can: () => mocks.can,
    isLoading: mocks.isLoading,
  }),
}));

vi.mock('@/hooks/use-job-permissions', () => ({
  useJobPermissions: () => ({
    canOnJob: () => mocks.canOnJob,
    isLoading: mocks.isJobLoading,
  }),
}));

const permission = 'job:read' as Permission;

beforeEach(() => {
  mocks.can = false;
  mocks.canOnJob = false;
  mocks.isJobLoading = false;
  mocks.isLoading = false;
  mocks.navigate.mockReset();
  mocks.navigate.mockResolvedValue(undefined);
});

describe('RoutePermissionGuard', () => {
  it('does not redirect or expose children while permissions are loading', async () => {
    mocks.isLoading = true;
    const screen = await render(
      <RoutePermissionGuard permission={permission} orgId="org-1">
        <main>Protected route</main>
      </RoutePermissionGuard>,
    );

    expect(mocks.navigate).not.toHaveBeenCalled();
    await expect.element(screen.getByText('Protected route')).not.toBeInTheDocument();
  });

  it('redirects a denied route without rendering protected children', async () => {
    const screen = await render(
      <RoutePermissionGuard permission={permission} orgId="org-1">
        <main>Protected route</main>
      </RoutePermissionGuard>,
    );

    await vi.waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({ to: '/org/$orgId', params: { orgId: 'org-1' } }),
    );
    await expect.element(screen.getByText('Protected route')).not.toBeInTheDocument();
  });

  it('renders an allowed route without redirecting', async () => {
    mocks.can = true;
    const screen = await render(
      <RoutePermissionGuard permission={permission} orgId="org-1">
        <main>Protected route</main>
      </RoutePermissionGuard>,
    );

    await expect.element(screen.getByText('Protected route')).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('applies the same deny boundary to job-scoped permissions', async () => {
    const screen = await render(
      <JobRoutePermissionGuard permission={permission} orgId="org-1" jobId="job-1">
        <main>Protected job route</main>
      </JobRoutePermissionGuard>,
    );

    await vi.waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(1));
    await expect.element(screen.getByText('Protected job route')).not.toBeInTheDocument();
  });
});
