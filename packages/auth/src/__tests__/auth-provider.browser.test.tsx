import { CryptoProxy } from '@comitium/crypto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { createIdentityClient, type IdentityClient } from '../auth-client';
import { AuthProvider } from '../auth-provider';
import { useAccountReadiness } from '../use-account-readiness';
import { API_URL, AUTH_USER_ID, identitySession, OTHER_AUTH_USER_ID, productUser } from './identity-fixtures';

vi.mock('@comitium/crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@comitium/crypto')>()),
  CryptoProxy: { clear: vi.fn() },
}));

let client: IdentityClient;
let nativeSession: ReturnType<typeof identitySession> | null;
let responseStatus: number;
let sessionRequests: number;

beforeEach(() => {
  nativeSession = identitySession();
  responseStatus = 200;
  sessionRequests = 0;
  vi.mocked(CryptoProxy.clear).mockReset();
  vi.mocked(CryptoProxy.clear).mockResolvedValue(undefined);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      sessionRequests += 1;

      return responseStatus === 200
        ? Response.json(nativeSession)
        : Response.json({ code: 'AUTH_REQUIRED' }, { status: responseStatus });
    }),
  );
  client = createIdentityClient(API_URL);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function Probe() {
  const { stage, user } = useAccountReadiness();

  return (
    <output aria-label="Account state">
      {stage}:{user?.authUserId ?? ''}
    </output>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    return this.state.error ? <p role="alert">{this.state.error.message}</p> : this.props.children;
  }
}

function tree(getSession = vi.fn(async () => productUser()), children: ReactNode = <Probe />) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

  return {
    queryClient,
    ui: (
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AuthProvider
            client={client}
            getSession={getSession}
            sessionQueryKey={(id) => ['session', id]}
            staleTime={60000}
          >
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    ),
  };
}

describe('native auth readiness and identity lifecycle', () => {
  it('bootstraps the authenticated product account', async () => {
    const getSession = vi.fn(async () => productUser());
    const { ui } = tree(getSession);
    const screen = await render(ui);

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${AUTH_USER_ID}`);
    expect(getSession).toHaveBeenCalledOnce();
    expect(CryptoProxy.clear).toHaveBeenCalledOnce();
  });

  it('does not bootstrap an anonymous visitor', async () => {
    nativeSession = null;
    const getSession = vi.fn(async () => productUser());
    const screen = await render(tree(getSession).ui);

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent('anonymous:');
    expect(getSession).not.toHaveBeenCalled();
  });

  it('rejects a bootstrap response belonging to a different auth identity', async () => {
    const screen = await render(tree(vi.fn(async () => productUser(OTHER_AUTH_USER_ID))).ui);

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not load your account. Try again.');
    await expect.element(screen.getByLabelText('Account state')).not.toBeInTheDocument();
  });

  it('reports an initial native outage without entering automatic session recovery', async () => {
    responseStatus = 503;
    const getSession = vi.fn(async () => productUser());
    const screen = await render(tree(getSession).ui);

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not check your sign-in. Try again.');
    expect(getSession).not.toHaveBeenCalled();
    expect(CryptoProxy.clear).not.toHaveBeenCalled();
    await expect.element(screen.getByLabelText('Account state')).not.toBeInTheDocument();
  });

  it('reports a bootstrap outage without entering automatic session recovery', async () => {
    const getSession = vi.fn(async () => {
      throw new Error('Private infrastructure details');
    });
    const screen = await render(tree(getSession).ui);

    await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not load your account. Try again.');
    await expect.element(screen.getByLabelText('Account state')).not.toBeInTheDocument();
    expect(CryptoProxy.clear).toHaveBeenCalledOnce();
  });

  it('clears the previous identity before publishing a switched account', async () => {
    const getSession = vi.fn(async () => productUser(nativeSession?.user.id));
    const { ui, queryClient } = tree(getSession);
    const screen = await render(ui);

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${AUTH_USER_ID}`);

    queryClient.setQueryData(['private', 'previous-user'], 'private cached data');

    let finishClear!: () => void;

    vi.mocked(CryptoProxy.clear).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishClear = resolve;
        }),
    );
    nativeSession = identitySession(OTHER_AUTH_USER_ID);

    client.$store.notify('$sessionSignal');

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent('authenticating:');
    expect(getSession).toHaveBeenCalledTimes(1);

    finishClear();

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${OTHER_AUTH_USER_ID}`);
    expect(queryClient.getQueryData(['private', 'previous-user'])).toBeUndefined();
  });

  it('preserves the Worker during same-user reauthentication', async () => {
    const screen = await render(tree().ui);

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${AUTH_USER_ID}`);

    nativeSession = { ...identitySession(), session: { ...identitySession().session, id: 'new-session-id' } };

    client.$store.notify('$sessionSignal');

    await vi.waitFor(() => expect(sessionRequests).toBeGreaterThan(1));
    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${AUTH_USER_ID}`);
    expect(CryptoProxy.clear).toHaveBeenCalledOnce();
  });

  it('preserves an active identity on a transient native session failure', async () => {
    const screen = await render(tree().ui);

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${AUTH_USER_ID}`);

    responseStatus = 503;

    client.$store.notify('$sessionSignal');

    await vi.waitFor(() => expect(sessionRequests).toBeGreaterThan(1));
    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${AUTH_USER_ID}`);
    expect(CryptoProxy.clear).toHaveBeenCalledOnce();
  });

  it('clears RAM and private queries on confirmed auth loss', async () => {
    const { ui, queryClient } = tree();
    const screen = await render(ui);

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${AUTH_USER_ID}`);

    queryClient.setQueryData(['private', 'previous-user'], 'private cached data');
    responseStatus = 401;

    client.$store.notify('$sessionSignal');

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent('anonymous:');
    expect(queryClient.getQueryData(['private', 'previous-user'])).toBeUndefined();
    expect(CryptoProxy.clear).toHaveBeenCalledTimes(2);
  });

  it('periodically calls native get-session so active sessions can slide', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

    const screen = await render(tree().ui);

    await expect.element(screen.getByLabelText('Account state')).toHaveTextContent(`ready:${AUTH_USER_ID}`);

    const before = sessionRequests;

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.waitFor(() => expect(sessionRequests).toBeGreaterThan(before));
  });
});
