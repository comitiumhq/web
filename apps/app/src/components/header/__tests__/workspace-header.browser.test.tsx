import { LS_LAST_ORG_ID } from '@comitium/auth/storage';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { MyOrg } from '@/lib/schemas/org';

import { WorkspaceHeader } from '../workspace-header';

const mocks = vi.hoisted(() => ({
  orgs: [{ id: 'org-1' }] as MyOrg[],
  pathname: '/account',
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useParams: () => ({}),
  useRouterState: () => ({ location: { pathname: mocks.pathname } }),
}));

vi.mock('@/components/user/user-menu', () => ({ UserMenu: () => null }));
vi.mock('@/config/site', () => ({ getPublicSiteOrigin: () => 'http://localhost:3000' }));
vi.mock('@/hooks/queries/use-query-my-orgs', () => ({ useQueryMyOrgs: () => ({ data: mocks.orgs }) }));
vi.mock('@/hooks/use-permissions', () => ({ useQueryOrgMe: () => ({ data: { role: 'org_admin' } }) }));

beforeEach(() => {
  localStorage.setItem(LS_LAST_ORG_ID, 'org-1');
  mocks.orgs = [{ id: 'org-1' }] as MyOrg[];
  mocks.pathname = '/account';
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
