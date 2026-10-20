import { CryptoProxy, UnlockApiError } from '@comitium/crypto';
import type { User } from '@comitium/schemas/auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { StorageAccess } from '../storage/storage-access';
import { encryptedProductUser, productUser } from './identity-fixtures';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  refreshSession: vi.fn().mockResolvedValue(undefined),
  warning: vi.fn(),
  isCryptoActive: false,
}));

vi.mock('../use-session', () => ({ useSession: () => ({ user: mocks.user }) }));
vi.mock('../use-crypto-unlock', () => ({
  useCryptoUnlock: () => ({ refreshSession: mocks.refreshSession, isCryptoActive: mocks.isCryptoActive }),
}));
vi.mock('../fresh-authentication', () => ({
  useConfirmFreshAuthentication: () => async () => {},
}));
vi.mock('sonner', () => ({ toast: { warning: mocks.warning } }));

const PASSWORD = 'A long storage password for this test';
const CODE = 'ABCD-EFGH-JKLM-NPQR-STVW-XY23-45';

beforeEach(() => {
  mocks.user = encryptedProductUser();
  mocks.refreshSession.mockClear();
  mocks.warning.mockClear();
  mocks.isCryptoActive = false;
});

afterEach(() => vi.restoreAllMocks());

async function fillNewPassword(screen: Awaited<ReturnType<typeof render>>, label = 'New password') {
  await screen.getByLabelText(label, { exact: true }).fill(PASSWORD);
  await screen.getByLabelText('Confirm password', { exact: true }).fill(PASSWORD);
}

async function confirmCode(screen: Awaited<ReturnType<typeof render>>) {
  await expect.element(screen.getByRole('heading', { name: 'Save your recovery kit' })).toBeVisible();
  await screen.getByLabelText('I saved my recovery code').click();
  await screen.getByRole('button', { name: 'Continue', exact: true }).click();
}

describe('storage access', () => {
  it('keeps passwords masked and rejects mismatched confirmation before creating keys', async () => {
    mocks.user = productUser();
    const initialize = vi.spyOn(CryptoProxy, 'initializeUserKey');
    const screen = await render(<StorageAccess />);
    const password = screen.getByLabelText('Password', { exact: true });
    const confirmation = screen.getByLabelText('Confirm password', { exact: true });

    await password.fill(PASSWORD);
    await confirmation.fill('A different long password');
    await expect.element(password).toHaveAttribute('type', 'password');
    await expect.element(confirmation).toHaveAttribute('type', 'password');
    await screen.getByRole('button', { name: 'Show password', exact: true }).click();
    await expect.element(password).toHaveAttribute('type', 'text');
    await expect.element(confirmation).toHaveAttribute('type', 'password');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(initialize).not.toHaveBeenCalled();
  });

  it.each(['change', 'recovery-kit'] as const)(
    'keeps active storage open after an incorrect password in %s',
    async (mode) => {
      vi.spyOn(CryptoProxy, 'isActiveFor').mockReturnValue(true);
      const verify = vi
        .spyOn(CryptoProxy, 'verifyPassword')
        .mockRejectedValue(new DOMException('Incorrect password', 'OperationError'));
      const unlock = vi.spyOn(CryptoProxy, 'unlockWithPassword');
      const rewrap = vi.spyOn(CryptoProxy, 'rewrapUserKey');
      const screen = await render(<StorageAccess initialMode={mode} />);

      if (mode === 'change') {
        await screen.getByLabelText('Current password', { exact: true }).fill('incorrect password');
        await fillNewPassword(screen);
      } else {
        await screen.getByLabelText('Current password', { exact: true }).fill('incorrect password');
      }

      await screen
        .getByRole('button', { name: mode === 'change' ? 'Change password' : 'Continue', exact: true })
        .click();
      await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not decrypt');
      expect(verify).toHaveBeenCalledOnce();
      expect(unlock).not.toHaveBeenCalled();
      expect(rewrap).not.toHaveBeenCalled();
    },
  );

  it('sets up an invited user with only a password and no hidden recovery code', async () => {
    mocks.user = productUser();
    const user = encryptedProductUser();
    const complete = vi.fn();
    const initialize = vi.spyOn(CryptoProxy, 'initializeUserKey').mockResolvedValue({
      publicKey: user.publicKey,
      encryptedUserKey: {
        ...user.encryptedUserKey,
        wraps: user.encryptedUserKey.wraps.filter((wrap) => wrap.method === 'password'),
      },
      rememberedDevice: 'remembered',
      recoveryCode: undefined,
    });
    const screen = await render(<StorageAccess onSuccess={complete} />);
    await fillNewPassword(screen, 'Password');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(initialize).toHaveBeenCalledWith(mocks.user.id, PASSWORD, true, undefined);
    await expect.element(screen.getByRole('heading', { name: 'Save your recovery kit' })).not.toBeInTheDocument();
  });

  it.each([undefined, 'recovery'] as const)(
    'keeps locked password-only accounts on unlock without a dead-end recovery action (%s)',
    async (initialMode) => {
      const user = encryptedProductUser();
      mocks.user = {
        ...user,
        encryptedUserKey: {
          ...user.encryptedUserKey,
          wraps: user.encryptedUserKey.wraps.filter((wrap) => wrap.method === 'password'),
        },
      };
      const screen = await render(<StorageAccess initialMode={initialMode} />);
      await expect.element(screen.getByRole('button', { name: 'Forgot password?' })).not.toBeInTheDocument();
      await expect.element(screen.getByRole('heading', { name: 'Enter your password' })).toBeVisible();
      await expect
        .element(screen.getByText('Forgot your password? Use a device where your data is still unlocked.'))
        .toBeVisible();
      await expect.element(screen.getByLabelText('Recovery code', { exact: true })).not.toBeInTheDocument();
      await expect.element(screen.getByLabelText('New password', { exact: true })).not.toBeInTheDocument();
    },
  );

  it('opens code recovery from unlock when a recovery kit exists', async () => {
    const screen = await render(<StorageAccess />);
    await screen.getByRole('button', { name: 'Forgot password?' }).click();
    await expect.element(screen.getByLabelText('Recovery code', { exact: true })).toBeVisible();
    await screen.getByRole('button', { name: 'Back', exact: true }).click();
    await expect.element(screen.getByRole('heading', { name: 'Enter your password' })).toBeVisible();
  });

  it('shows and confirms the recovery code before completing explicit setup', async () => {
    mocks.user = productUser();
    const saved = vi.fn();
    const complete = vi.fn();
    let finishSave!: () => void;
    const saving = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    const initialize = vi
      .spyOn(CryptoProxy, 'initializeUserKey')
      .mockImplementation(async (_userId, _password, _remember, showCode) => {
        await showCode?.(CODE);
        saved();
        await saving;
        const user = encryptedProductUser();
        return {
          publicKey: user.publicKey,
          encryptedUserKey: user.encryptedUserKey,
          recoveryCode: CODE,
          rememberedDevice: 'remembered',
        };
      });

    const screen = await render(<StorageAccess requireRecovery onSuccess={complete} />);
    expect(saved).not.toHaveBeenCalled();
    await expect.element(screen.getByRole('heading', { name: 'Create a password' })).toBeVisible();
    await expect.element(screen.getByRole('checkbox', { name: 'Remember this device' })).not.toBeInTheDocument();
    await fillNewPassword(screen, 'Password');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    expect(initialize).toHaveBeenCalledWith(mocks.user?.id, PASSWORD, true, expect.any(Function));
    await expect.element(screen.getByRole('heading', { name: 'Save your recovery kit' })).toBeVisible();
    expect(saved).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();

    await confirmCode(screen);
    await expect.element(screen.getByRole('heading', { name: 'Save your recovery kit' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
    expect(complete).not.toHaveBeenCalled();
    finishSave();
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(saved).toHaveBeenCalledOnce();
    expect(mocks.refreshSession).toHaveBeenCalledWith(true);
  });

  it('cancels setup before saving when recovery confirmation is cancelled', async () => {
    mocks.user = productUser();
    const saved = vi.fn();
    vi.spyOn(CryptoProxy, 'initializeUserKey').mockImplementation(async (_userId, _password, _remember, showCode) => {
      await showCode?.(CODE);
      saved();
      throw new Error('Must not write after cancellation');
    });
    const screen = await render(<StorageAccess requireRecovery />);
    await fillNewPassword(screen, 'Password');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect.element(screen.getByRole('heading', { name: 'Save your recovery kit' })).toBeVisible();
    await screen.getByRole('button', { name: 'Back', exact: true }).click();
    await expect.element(screen.getByLabelText('Password', { exact: true })).toBeVisible();
    expect(saved).not.toHaveBeenCalled();
  });

  it('remembers automatically and keeps a successful unlock when device storage is unavailable', async () => {
    const unlock = vi.spyOn(CryptoProxy, 'unlockWithPassword').mockResolvedValue({ rememberedDevice: 'unavailable' });
    const complete = vi.fn();
    const screen = await render(<StorageAccess requireRecovery onSuccess={complete} />);
    await expect.element(screen.getByRole('checkbox', { name: 'Remember this device' })).not.toBeInTheDocument();
    await screen.getByLabelText('Password', { exact: true }).fill(PASSWORD);
    await screen.getByRole('button', { name: 'Unlock', exact: true }).click();
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(unlock).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      mocks.user?.id,
      mocks.user?.publicKey,
      PASSWORD,
      true,
    );
    expect(mocks.warning).toHaveBeenCalledOnce();
  });

  it('distinguishes unavailable password shares from incorrect secrets', async () => {
    vi.spyOn(CryptoProxy, 'unlockWithPassword').mockRejectedValue(new UnlockApiError(503, 'KEY_SHARE_UNAVAILABLE'));
    const screen = await render(<StorageAccess />);
    await screen.getByLabelText('Password', { exact: true }).fill(PASSWORD);
    await screen.getByRole('button', { name: 'Unlock', exact: true }).click();
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Password unlock is temporarily unavailable');
  });

  it('changes password only after checking the current storage password', async () => {
    const unlock = vi.spyOn(CryptoProxy, 'unlockWithPassword').mockResolvedValue({ rememberedDevice: 'not_requested' });
    const rewrap = vi
      .spyOn(CryptoProxy, 'rewrapUserKey')
      .mockResolvedValue({ encryptedUserKey: encryptedProductUser().encryptedUserKey, recoveryCode: null });
    const complete = vi.fn();
    const screen = await render(<StorageAccess initialMode="change" onSuccess={complete} />);
    await screen.getByLabelText('Current password', { exact: true }).fill('old storage password');
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Change password', exact: true }).click();
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(unlock.mock.invocationCallOrder[0]).toBeLessThan(rewrap.mock.invocationCallOrder[0]);
    expect(rewrap).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      { password: PASSWORD, rotateRecoveryCode: false, repairShare: false },
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('recovers with an independent code and confirms its replacement before rewrapping', async () => {
    vi.spyOn(CryptoProxy, 'unlockWithRecoveryCode').mockResolvedValue({ rememberedDevice: 'remembered' });
    const saved = vi.fn();
    const rewrap = vi.spyOn(CryptoProxy, 'rewrapUserKey').mockImplementation(async (wrapped, _options, showCode) => {
      await showCode?.(CODE);
      saved();
      return { encryptedUserKey: wrapped, recoveryCode: CODE };
    });
    const complete = vi.fn();
    const screen = await render(<StorageAccess initialMode="recovery" onSuccess={complete} />);
    await screen.getByLabelText('Recovery code', { exact: true }).fill('previous recovery code');
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect.element(screen.getByRole('heading', { name: 'Save your recovery kit' })).toBeVisible();
    expect(saved).not.toHaveBeenCalled();
    await confirmCode(screen);
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(rewrap).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      { password: PASSWORD, rotateRecoveryCode: true, repairShare: true },
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('verifies the storage password before rotating recovery without repairing its share', async () => {
    const unlock = vi.spyOn(CryptoProxy, 'unlockWithPassword').mockResolvedValue({ rememberedDevice: 'not_requested' });
    const rewrap = vi.spyOn(CryptoProxy, 'rewrapUserKey').mockImplementation(async (wrapped, _options, showCode) => {
      await showCode?.(CODE);
      return { encryptedUserKey: wrapped, recoveryCode: CODE };
    });
    const complete = vi.fn();
    const screen = await render(<StorageAccess initialMode="recovery-kit" onSuccess={complete} />);

    await screen.getByLabelText('Current password', { exact: true }).fill(PASSWORD);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await confirmCode(screen);
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());

    expect(unlock).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      mocks.user?.id,
      mocks.user?.publicKey,
      PASSWORD,
      true,
    );
    expect(unlock.mock.invocationCallOrder[0]).toBeLessThan(rewrap.mock.invocationCallOrder[0]);
    expect(rewrap).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      { rotateRecoveryCode: true, repairShare: false },
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('uses the current unlocked session to recover without a remembered-device record', async () => {
    vi.spyOn(CryptoProxy, 'isActiveFor').mockReturnValue(true);
    const remembered = vi.spyOn(CryptoProxy, 'rewrapWithRememberedDevice');
    const rewrap = vi
      .spyOn(CryptoProxy, 'rewrapUserKey')
      .mockResolvedValue({ encryptedUserKey: encryptedProductUser().encryptedUserKey, recoveryCode: null });
    const complete = vi.fn();
    mocks.isCryptoActive = true;
    const screen = await render(<StorageAccess initialMode="recovery" onSuccess={complete} />);
    await expect.element(screen.getByRole('heading', { name: 'Create a new password' })).toBeVisible();
    await expect.element(screen.getByLabelText('Recovery code', { exact: true })).not.toBeInTheDocument();
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Change password', exact: true }).click();

    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(rewrap).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      { password: PASSWORD, rotateRecoveryCode: false, repairShare: true },
      expect.any(Function),
      expect.any(Function),
    );
    expect(remembered).not.toHaveBeenCalled();
  });

  it('rejects a late recovery prompt after the setup screen is closed', async () => {
    mocks.user = productUser();
    let continueSetup!: () => void;
    const saved = vi.fn();
    vi.spyOn(CryptoProxy, 'initializeUserKey').mockImplementation(async (_userId, _password, _remember, showCode) => {
      await new Promise<void>((resolve) => {
        continueSetup = resolve;
      });
      await showCode?.(CODE);
      saved();
      throw new Error('Must not save after the form was closed');
    });
    const complete = vi.fn();
    const screen = await render(<StorageAccess requireRecovery onSuccess={complete} />);
    await fillNewPassword(screen, 'Password');
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await screen.rerender(<p>Another page</p>);
    continueSetup();

    await vi.waitFor(() => expect(mocks.refreshSession).toHaveBeenCalled());
    expect(saved).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
});
