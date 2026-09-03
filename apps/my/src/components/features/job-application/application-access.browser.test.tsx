import type { ComponentProps, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ApplicationForm } from './index';

const mocks = vi.hoisted(() => ({
  session: {
    isSessionLoading: false,
    isSignedIn: false,
  },
}));

vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => mocks.session,
}));

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  Link: ({ children, search, to }: { children: ReactNode; search: { returnTo: string }; to: string }) => (
    <a href={`${to}?returnTo=${encodeURIComponent(search.returnTo)}`}>{children}</a>
  ),
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({
      location: {
        hash: '#apply',
        pathname: '/careers/comitium/jobs/frontend-engineer',
        searchStr: '?source=board',
      },
    }),
}));

const applicationProps = {} as ComponentProps<typeof ApplicationForm>;

beforeEach(() => {
  mocks.session = {
    isSessionLoading: false,
    isSignedIn: false,
  };
});

describe('ApplicationForm access boundary', () => {
  it('requires sign-in before rendering fields so an OAuth reload cannot discard entered answers', async () => {
    const screen = await render(<ApplicationForm {...applicationProps} />);

    await expect.element(screen.getByRole('heading', { name: 'Sign in to apply' })).toBeInTheDocument();
    await expect.element(screen.getByRole('textbox')).not.toBeInTheDocument();
    await expect
      .element(screen.getByRole('link', { name: 'Sign in' }))
      .toHaveAttribute(
        'href',
        '/login?returnTo=%2Fcareers%2Fcomitium%2Fjobs%2Ffrontend-engineer%3Fsource%3Dboard%23apply',
      );
  });

  it('does not flash the sign-in prompt while the existing session is resolving', async () => {
    mocks.session = {
      isSessionLoading: true,
      isSignedIn: false,
    };
    const screen = await render(<ApplicationForm {...applicationProps} />);

    await expect.element(screen.getByLabelText('Loading application form')).toBeInTheDocument();
    await expect.element(screen.getByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});
