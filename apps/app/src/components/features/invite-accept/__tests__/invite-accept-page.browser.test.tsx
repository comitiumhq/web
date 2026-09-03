import type { AccountStage } from '@comitium/auth/account-stage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { InviteInfo } from '@/lib/schemas/org';
import { InviteAcceptPage } from '..';

const mocks = vi.hoisted(() => ({
  accountStage: 'ready' as AccountStage,
  accountEmail: 'personal@example.com' as string | null,
  invite: undefined as InviteInfo | undefined,
  isLoading: false,
  queryError: null as Error | null,
  isAccepting: false,
  acceptInvite: vi.fn(),
  logout: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@comitium/auth/use-account-readiness', () => ({
  useAccountReadiness: () => ({ stage: mocks.accountStage }),
}));

vi.mock('@comitium/auth/privy-account', () => ({
  getPrivyAccountEmail: () => mocks.accountEmail,
}));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ user: {} }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('@/hooks/queries/use-query-invite', () => ({
  useQueryInvite: () => ({
    data: mocks.invite,
    isLoading: mocks.isLoading,
    error: mocks.queryError,
  }),
}));

vi.mock('@/hooks/mutations/use-accept-invite', () => ({
  useAcceptInvite: () => ({
    mutate: mocks.acceptInvite,
    isPending: mocks.isAccepting,
  }),
}));

vi.mock('@/hooks/use-logout', () => ({
  useLogout: () => mocks.logout,
}));

const ACTIVE_INVITE: InviteInfo = {
  orgName: 'Comitium',
  orgLogo: null,
  role: 'org_member',
  email: 'recruiter@comitium.test',
  expiresAt: '2026-08-31T00:00:00.000Z',
  isExpired: false,
  isRevoked: false,
  isAccepted: false,
};

function renderPage() {
  return render(<InviteAcceptPage token="invite-token" />);
}

beforeEach(() => {
  window.history.replaceState({}, '', '/invite?token=invite-token');

  mocks.accountStage = 'ready';
  mocks.accountEmail = 'personal@example.com';
  mocks.invite = ACTIVE_INVITE;
  mocks.isLoading = false;
  mocks.queryError = null;
  mocks.isAccepting = false;
  mocks.acceptInvite.mockReset();
  mocks.logout.mockReset();
  mocks.logout.mockResolvedValue(true);
  mocks.navigate.mockReset();
});

describe('InviteAcceptPage global account actions', () => {
  it('waits for explicit confirmation before joining with the signed-in account', async () => {
    const screen = await renderPage();

    expect(mocks.acceptInvite).not.toHaveBeenCalled();
    await expect.element(screen.getByText('personal@example.com')).toBeInTheDocument();
    await expect.element(screen.getByText('Invited via recruiter@comitium.test')).toBeInTheDocument();

    await screen.getByRole('button', { name: 'Join workspace' }).click();

    expect(mocks.acceptInvite).toHaveBeenCalledTimes(1);
    expect(mocks.acceptInvite.mock.calls[0]?.[0]).toBe('invite-token');
  });

  it('offers ordinary Sign in and Create account actions without work-email warnings', async () => {
    mocks.accountStage = 'anonymous';
    const screen = await renderPage();

    await expect
      .element(screen.getByText('Sign in or create your Comitium account to join this workspace.'))
      .toBeInTheDocument();
    await expect.element(screen.getByText(/wallet|mailbox|merge/i)).not.toBeInTheDocument();

    await screen.getByRole('button', { name: 'Create account' }).click();
    expect(mocks.navigate).toHaveBeenCalledWith({
      search: { returnTo: '/invite?token=invite-token' },
      to: '/signup',
    });
  });

  it('switches accounts only after an explicit action and preserves the invite URL', async () => {
    const screen = await renderPage();

    expect(mocks.logout).not.toHaveBeenCalled();

    await screen.getByRole('button', { name: 'Use another account' }).click();

    expect(mocks.logout).toHaveBeenCalledWith({ returnTo: '/invite?token=invite-token' });
    expect(mocks.acceptInvite).not.toHaveBeenCalled();
  });

  it('retries an accepted and expired invite only after the original account clicks continue', async () => {
    mocks.invite = { ...ACTIVE_INVITE, isAccepted: true, isExpired: true };
    const screen = await renderPage();

    expect(mocks.acceptInvite).not.toHaveBeenCalled();

    await screen.getByRole('button', { name: 'Continue to workspace' }).click();

    expect(mocks.acceptInvite.mock.calls[0]?.[0]).toBe('invite-token');
  });

  it('shows acceptance and account-switch failures without navigating', async () => {
    const screen = await renderPage();

    await screen.getByRole('button', { name: 'Join workspace' }).click();
    const acceptOptions = mocks.acceptInvite.mock.calls[0]?.[1];

    acceptOptions.onError(new Error('Invite belongs to another account'));

    await expect.element(screen.getByText('Invite belongs to another account')).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();

    mocks.logout.mockResolvedValue(false);
    await screen.getByRole('button', { name: 'Use another account' }).click();

    await expect.element(screen.getByText("We couldn't switch accounts. Try again.")).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
