import { ApiError } from '@comitium/schemas/api-errors';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AuthenticatedAppShell } from '../authenticated-app-shell';
import { OrgGuard } from '../org-guard';

const mocks = vi.hoisted(() => ({
  ensureCreatedOrgEncryption: vi.fn(),
  memberQuery: { error: null as unknown },
  orgsQuery: {
    data: undefined as Array<Record<string, unknown>> | undefined,
    error: null as unknown,
    isLoading: false,
  },
  session: {
    isSessionLoading: false,
    isSignedIn: true,
    needsSessionRecovery: false,
  },
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => mocks.session,
}));

vi.mock('@/hooks/queries/use-query-my-orgs', () => ({
  useQueryMyOrgs: () => mocks.orgsQuery,
}));

vi.mock('@/hooks/queries/use-query-org-creation', () => ({
  useQueryOrgCreation: () => ({
    data: {
      status: 'created',
      organizationId: 'org-1',
      hasActiveMembership: true,
    },
  }),
}));

vi.mock('@/hooks/queries/use-ensure-created-org-encryption', () => ({
  useEnsureCreatedOrgEncryption: (orgId: string | null) => {
    mocks.ensureCreatedOrgEncryption(orgId);

    return { isPending: true };
  },
}));

vi.mock('@/hooks/use-permissions', () => ({
  PermissionsProvider: ({ children }: { children: ReactNode }) => children,
  useQueryOrgMe: () => mocks.memberQuery,
}));

vi.mock('@/hooks/use-auto-detect-timezone', () => ({
  useAutoDetectTimezone: vi.fn(),
}));

vi.mock('@/components/features/vault-access/vault-access-banner', () => ({
  VaultAccessBanner: () => <aside>Vault access required</aside>,
}));

vi.mock('@/components/header/workspace-header', () => ({
  WorkspaceHeader: () => <header>Workspace header</header>,
}));

vi.mock('../auth-session-recovery', () => ({
  AuthSessionRecovery: () => <main>Recovering session</main>,
}));

vi.mock('../connect-wallet-button', () => ({
  ConnectWalletButton: () => <button type="button">Sign in</button>,
}));

const org = {
  id: 'org-1',
  role: 'org_member',
  hasVaultAccess: false,
};

function tree() {
  return <OrgGuard orgId="org-1">{() => <main>Organization workspace</main>}</OrgGuard>;
}

beforeEach(() => {
  mocks.ensureCreatedOrgEncryption.mockClear();
  mocks.memberQuery = { error: null };
  mocks.orgsQuery = { data: undefined, error: null, isLoading: false };
  mocks.session = {
    isSessionLoading: false,
    isSignedIn: true,
    needsSessionRecovery: false,
  };
});

describe('OrgGuard', () => {
  it('does not render or reject the organization while session and organization data are loading', async () => {
    mocks.session.isSessionLoading = true;
    mocks.orgsQuery.isLoading = true;
    const screen = await render(tree());

    await expect.element(screen.getByText('Organization workspace')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Page not found')).not.toBeInTheDocument();
  });

  it('shows the sign-in boundary only after the session has settled anonymous', async () => {
    mocks.session.isSignedIn = false;
    const screen = await render(tree());

    await expect.element(screen.getByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
    await expect.element(screen.getByText('Organization workspace')).not.toBeInTheDocument();
  });

  it('recovers an expired session instead of rendering protected children', async () => {
    mocks.orgsQuery.error = new ApiError(401, 'Expired');
    const screen = await render(tree());

    await expect.element(screen.getByText('Recovering session')).toBeInTheDocument();
    await expect.element(screen.getByText('Organization workspace')).not.toBeInTheDocument();
  });

  it('renders the organization only after membership data resolves and surfaces missing vault access', async () => {
    mocks.orgsQuery.data = [org];
    const screen = await render(tree());

    await expect.element(screen.getByText('Organization workspace')).toBeInTheDocument();
    await expect.element(screen.getByText('Vault access required')).toBeInTheDocument();
  });

  it('does not show the missing-access banner while the created organization vault is initializing', async () => {
    mocks.orgsQuery.data = [{ ...org, role: 'org_admin' }];
    const screen = await render(<AuthenticatedAppShell>{tree()}</AuthenticatedAppShell>);

    await expect.element(screen.getByText('Organization workspace')).toBeInTheDocument();
    await expect.element(screen.getByText('Vault access required')).not.toBeInTheDocument();
    expect(mocks.ensureCreatedOrgEncryption).toHaveBeenCalledWith('org-1');
  });
});
