import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AuthGuard } from '../auth-guard';

const mocks = vi.hoisted(() => ({
  session: { isSessionLoading: false, isSignedIn: false },
}));

vi.mock('../use-session', () => ({ useSession: () => mocks.session }));

beforeEach(() => {
  mocks.session = { isSessionLoading: false, isSignedIn: false };
});

async function renderGuard(path = '/account') {
  const rootRoute = createRootRoute({ component: Outlet });
  const routes = ['/account', '/applications', '/login'].map((routePath) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: routePath,
      component: () => (
        <AuthGuard>
          <main>Protected content</main>
        </AuthGuard>
      ),
    }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const screen = await render(<RouterProvider router={router} />);

  return { router, screen };
}

describe('shared AuthGuard', () => {
  it.each(['/account?source=menu#methods', '/applications?filter=active#details'])(
    'preserves the complete protected destination: %s',
    async (returnTo) => {
      const { router, screen } = await renderGuard(returnTo);

      await vi.waitFor(() => expect(router.state.location.pathname).toBe('/login'));
      expect(router.state.location.search).toEqual({ returnTo });
      await expect.element(screen.getByText('Protected content')).not.toBeInTheDocument();
    },
  );

  it('keeps protected content hidden while the session is loading', async () => {
    mocks.session.isSessionLoading = true;
    const { router, screen } = await renderGuard();

    await expect.element(screen.getByText('Protected content')).not.toBeInTheDocument();
    expect(router.state.location.href).toBe('/account');
  });

  it('renders protected content for an authenticated user', async () => {
    mocks.session.isSignedIn = true;
    const { screen } = await renderGuard();

    await expect.element(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('does not redirect an anonymous visitor back to the login route', async () => {
    const { router, screen } = await renderGuard('/login');

    await expect.element(screen.getByText('Protected content')).not.toBeInTheDocument();
    expect(router.state.location.href).toBe('/login');
  });
});
