import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AuthGuard } from './auth-guard';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  session: {
    isSessionLoading: false,
    isSignedIn: false,
    needsSessionRecovery: false,
  },
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => mocks.session,
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mocks.navigate,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({
      location: {
        hash: '#deposit',
        pathname: '/applications',
        searchStr: '?filter=active',
      },
    }),
}));

vi.mock('./auth-session-recovery', () => ({
  AuthSessionRecovery: ({ returnTo }: { returnTo: string }) => <main>Recover to {returnTo}</main>,
}));

beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.navigate.mockResolvedValue(undefined);
  mocks.session = {
    isSessionLoading: false,
    isSignedIn: false,
    needsSessionRecovery: false,
  };
});

describe('candidate AuthGuard', () => {
  it('redirects a settled anonymous visitor to login with the exact protected destination', async () => {
    const screen = await render(
      <AuthGuard>
        <main>My applications</main>
      </AuthGuard>,
    );

    await vi.waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({
        to: '/login',
        search: { returnTo: '/applications?filter=active#deposit' },
        replace: true,
      }),
    );
    await expect.element(screen.getByText('My applications')).not.toBeInTheDocument();
  });

  it('recovers a broken session without exposing protected children', async () => {
    mocks.session.needsSessionRecovery = true;
    const screen = await render(
      <AuthGuard>
        <main>My applications</main>
      </AuthGuard>,
    );

    await expect
      .element(screen.getByText('Recover to /login?returnTo=%2Fapplications%3Ffilter%3Dactive%23deposit'))
      .toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
