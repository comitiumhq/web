import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AuthGuard } from '../auth-guard';

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => ({
    isSessionLoading: false,
    isSignedIn: false,
    needsSessionRecovery: true,
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({
      location: {
        hash: '#methods',
        pathname: '/account',
        searchStr: '?source=menu',
      },
    }),
}));

vi.mock('@/hooks/use-logout', () => ({
  useLogout: () => mocks.logout,
}));

beforeEach(() => {
  mocks.logout.mockReset();
  mocks.logout.mockResolvedValue(true);
  mocks.navigate.mockReset();
});

describe('AuthGuard session recovery', () => {
  it('returns to the protected destination after recovering the session', async () => {
    await render(
      <AuthGuard>
        <div>Account settings</div>
      </AuthGuard>,
    );

    expect(mocks.logout).toHaveBeenCalledWith({
      returnTo: '/login?returnTo=%2Faccount%3Fsource%3Dmenu%23methods',
    });
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
