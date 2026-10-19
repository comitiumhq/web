import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AuthGuard } from '../auth-guard';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => ({ isSessionLoading: false, isSignedIn: false }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { hash: '#methods', pathname: '/account', searchStr: '?source=menu' } }),
}));

beforeEach(() => navigate.mockReset());

describe('employer AuthGuard', () => {
  it('redirects anonymous visitors with the exact protected destination', async () => {
    const screen = await render(
      <AuthGuard>
        <div>Account settings</div>
      </AuthGuard>,
    );

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledExactlyOnceWith({
        to: '/login',
        search: { returnTo: '/account?source=menu#methods' },
        replace: true,
      }),
    );
    await expect.element(screen.getByText('Account settings')).not.toBeInTheDocument();
  });
});
