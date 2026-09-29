import { LS_LAST_ORG_ID } from '@comitium/auth/storage';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { MyOrg } from '@/lib/schemas/org';

import { WorkspaceHeader } from '../workspace-header';

const mocks = vi.hoisted(() => ({
  hasJobAccess: true,
  orgId: undefined as string | undefined,
  orgs: [{ id: 'org-1', hasVaultAccess: true }] as MyOrg[],
  pathname: '/account',
  role: 'org_admin' as 'org_admin' | 'org_member',
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useParams: () => ({ orgId: mocks.orgId }),
  useRouterState: () => ({ location: { pathname: mocks.pathname } }),
}));

vi.mock('@/components/user/user-menu', () => ({ UserMenu: () => null }));
vi.mock('@/config/site', () => ({ getPublicSiteOrigin: () => 'http://localhost:3000' }));
vi.mock('@/hooks/queries/use-query-my-orgs', () => ({ useQueryMyOrgs: () => ({ data: mocks.orgs }) }));
vi.mock('@/hooks/use-permissions', () => ({
  useQueryOrgMe: () => ({ data: { hasJobAccess: mocks.hasJobAccess, role: mocks.role } }),
}));

beforeEach(() => {
  localStorage.setItem(LS_LAST_ORG_ID, 'org-1');
  mocks.hasJobAccess = true;
  mocks.orgId = undefined;
  mocks.orgs = [{ id: 'org-1', hasVaultAccess: true }] as MyOrg[];
  mocks.pathname = '/account';
  mocks.role = 'org_admin';
});

describe('WorkspaceHeader organization access', () => {
  it('shows limited job access as a compact status with contextual details', async () => {
    mocks.hasJobAccess = false;
    mocks.orgId = 'org-1';
    mocks.pathname = '/org/org-1';
    mocks.role = 'org_member';
    const screen = await render(<WorkspaceHeader />);

    await screen.getByRole('button', { name: 'Limited access' }).click();

    await expect.element(screen.getByText('Jobs and candidate profiles are unavailable.')).toBeInTheDocument();
  });

  it('hides the status when the member can access jobs', async () => {
    mocks.orgId = 'org-1';
    mocks.pathname = '/org/org-1';
    mocks.role = 'org_member';
    const screen = await render(<WorkspaceHeader />);

    await expect.element(screen.getByRole('button', { name: 'Limited access' })).not.toBeInTheDocument();
  });
});

describe('WorkspaceHeader account context', () => {
  it('keeps the preferred organization navigation visible on the global Account route', async () => {
    const screen = await render(<WorkspaceHeader />);

    await expect.element(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/org/org-1');
    await expect.element(screen.getByRole('link', { name: 'Pipeline' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Jobs' })).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Organization' })).toBeInTheDocument();
  });
});
