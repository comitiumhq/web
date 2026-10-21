import { CryptoProxy } from '@comitium/crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishSessionEvent } from '../session-events';
import { useRecoverSession } from '../session-recovery';
import { useAccountLogout } from '../use-logout';
import { encryptedProductUser } from './identity-fixtures';

const mocks = vi.hoisted(() => ({
  clearQueries: vi.fn(),
  replace: vi.fn(),
  removeItem: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@comitium/crypto', () => ({
  CryptoProxy: { logout: vi.fn(), clear: vi.fn(), destroy: vi.fn() },
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: mocks.clearQueries }) }));
vi.mock('../use-session', () => ({ useSession: () => ({ user: encryptedProductUser() }) }));
vi.mock('../session-events', () => ({ publishSessionEvent: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('window', { location: { replace: mocks.replace } });
  vi.stubGlobal('localStorage', { removeItem: mocks.removeItem });
});

afterEach(() => vi.unstubAllGlobals());

describe('session cleanup', () => {
  it('revokes the device even when storage is locked and clears private queries', async () => {
    const user = encryptedProductUser();
    const logout = useAccountLogout('/login');

    await expect(logout()).resolves.toBe(true);
    expect(CryptoProxy.logout).toHaveBeenCalledWith(false, {
      userId: user.id,
      wrapped: user.encryptedUserKey,
      publicKey: user.publicKey,
    });
    expect(publishSessionEvent).toHaveBeenNthCalledWith(1, 'logout-start', user.id);
    expect(publishSessionEvent).toHaveBeenNthCalledWith(2, 'logout-complete', user.id);
    expect(mocks.clearQueries).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });

  it('shares a pending logout and forwards explicit all-device revocation', async () => {
    let finish!: () => void;
    vi.mocked(CryptoProxy.logout).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const logout = useAccountLogout('/jobs');
    const anotherLogout = useAccountLogout('/login');
    const first = logout({ allDevices: true });
    const second = anotherLogout({ allDevices: true });

    expect(first).toBe(second);
    expect(CryptoProxy.logout).toHaveBeenCalledOnce();
    expect(CryptoProxy.logout).toHaveBeenCalledWith(true, expect.any(Object));
    expect(mocks.replace).not.toHaveBeenCalled();
    finish();
    await first;
    expect(mocks.replace).toHaveBeenCalledWith('/jobs');
  });

  it('clears private queries but reports failed revocation without claiming success', async () => {
    vi.mocked(CryptoProxy.logout).mockRejectedValue(new Error('Private server details'));
    const logout = useAccountLogout('/login');

    await expect(logout()).resolves.toBe(false);
    expect(mocks.clearQueries).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('Could not complete sign out. Please try again.');
    expect(publishSessionEvent).toHaveBeenCalledOnce();
    expect(publishSessionEvent).toHaveBeenCalledWith('logout-start', encryptedProductUser().id);
  });

  it('does not turn successful revocation into failure when localStorage is disabled', async () => {
    mocks.removeItem.mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    await expect(useAccountLogout('/login')()).resolves.toBe(true);
    expect(publishSessionEvent).toHaveBeenLastCalledWith('logout-complete', encryptedProductUser().id);
  });

  it('clears RAM on session expiry without revoking remembered-device access', async () => {
    await expect(useRecoverSession()({ returnTo: '/jobs' })).resolves.toBe(true);
    expect(CryptoProxy.clear).toHaveBeenCalledOnce();
    expect(CryptoProxy.logout).not.toHaveBeenCalled();
    expect(publishSessionEvent).not.toHaveBeenCalled();
    expect(mocks.replace).toHaveBeenCalledWith('/jobs');
  });

  it('destroys a failed Worker before completing expired-session cleanup', async () => {
    vi.mocked(CryptoProxy.clear).mockRejectedValue(new Error('Worker unavailable'));

    await expect(useRecoverSession()()).resolves.toBe(true);
    expect(CryptoProxy.destroy).toHaveBeenCalledOnce();
    expect(mocks.clearQueries).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith('/');
  });
});
