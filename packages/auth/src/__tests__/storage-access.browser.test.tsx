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
}));

vi.mock('../use-session', () => ({ useSession: () => ({ user: mocks.user }) }));
vi.mock('../use-crypto-unlock', () => ({ useCryptoUnlock: () => ({ refreshSession: mocks.refreshSession }) }));
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
});

afterEach(() => vi.restoreAllMocks());

async function fillNewPassword(screen: Awaited<ReturnType<typeof render>>) {
  await screen.getByLabelText('New storage password', { exact: true }).fill(PASSWORD);
  await screen.getByLabelText('Confirm storage password', { exact: true }).fill(PASSWORD);
}

async function confirmCode(screen: Awaited<ReturnType<typeof render>>) {
  await expect.element(screen.getByText(CODE, { exact: true })).toBeVisible();
  await screen.getByLabelText('I saved my recovery code').click();
  await screen.getByRole('button', { name: 'Continue', exact: true }).click();
}

describe('storage access', () => {
  it.each(['change', 'rotate-recovery'] as const)(
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
        await screen.getByLabelText('Current storage password', { exact: true }).fill('incorrect password');
        await fillNewPassword(screen);
      } else {
        await screen.getByLabelText('Storage password', { exact: true }).fill('incorrect password');
      }

      await screen.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not decrypt');
      expect(verify).toHaveBeenCalledOnce();
      expect(unlock).not.toHaveBeenCalled();
      expect(rewrap).not.toHaveBeenCalled();
    },
  );

  it('shows and confirms the recovery code before completing explicit setup', async () => {
    mocks.user = productUser();
    const saved = vi.fn();
    const complete = vi.fn();
    vi.spyOn(CryptoProxy, 'initializeUserKey').mockImplementation(async (_userId, _password, _remember, showCode) => {
      await showCode(CODE);
      saved();
      const user = encryptedProductUser();
      return {
        publicKey: user.publicKey,
        encryptedUserKey: user.encryptedUserKey,
        recoveryCode: CODE,
        rememberedDevice: 'remembered',
      };
    });

    const screen = await render(<StorageAccess onSuccess={complete} />);
    expect(saved).not.toHaveBeenCalled();
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect.element(screen.getByText(CODE, { exact: true })).toBeVisible();
    expect(saved).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();

    await confirmCode(screen);
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(saved).toHaveBeenCalledOnce();
    expect(mocks.refreshSession).toHaveBeenCalledWith(true);
  });

  it('cancels setup before saving when recovery confirmation is cancelled', async () => {
    mocks.user = productUser();
    const saved = vi.fn();
    vi.spyOn(CryptoProxy, 'initializeUserKey').mockImplementation(async (_userId, _password, _remember, showCode) => {
      await showCode(CODE);
      saved();
      throw new Error('Must not write after cancellation');
    });
    const screen = await render(<StorageAccess />);
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect.element(screen.getByText(CODE, { exact: true })).toBeVisible();
    await screen.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect.element(screen.getByLabelText('New storage password', { exact: true })).toBeVisible();
    expect(saved).not.toHaveBeenCalled();
  });

  it('remembers by default and keeps a successful unlock when device storage is unavailable', async () => {
    const unlock = vi.spyOn(CryptoProxy, 'unlockWithPassword').mockResolvedValue({ rememberedDevice: 'unavailable' });
    const complete = vi.fn();
    const screen = await render(<StorageAccess onSuccess={complete} />);
    await screen.getByLabelText('Storage password', { exact: true }).fill(PASSWORD);
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
    await screen.getByLabelText('Storage password', { exact: true }).fill(PASSWORD);
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
    await screen.getByLabelText('Current storage password', { exact: true }).fill('old storage password');
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
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
      await showCode(CODE);
      saved();
      return { encryptedUserKey: wrapped, recoveryCode: CODE };
    });
    const complete = vi.fn();
    const screen = await render(<StorageAccess initialMode="recovery" onSuccess={complete} />);
    await screen.getByLabelText('Recovery code', { exact: true }).fill('previous recovery code');
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect.element(screen.getByText(CODE, { exact: true })).toBeVisible();
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

  it('requires an explicit loss warning before showing destructive reset', async () => {
    const reset = vi.spyOn(CryptoProxy, 'resetUserKey');
    const screen = await render(<StorageAccess initialMode="reset" />);
    await expect
      .element(screen.getByText('New keys will not open your previous encrypted data.', { exact: false }))
      .toBeVisible();
    await expect.element(screen.getByLabelText('New storage password', { exact: true })).not.toBeInTheDocument();
    expect(reset).not.toHaveBeenCalled();
    await screen.getByRole('button', { name: 'I understand — create new keys' }).click();
    await expect.element(screen.getByLabelText('New storage password', { exact: true })).toBeVisible();
  });

  it.each([true, false])(
    'confirms recovery before replacing wrappers through device access (unlocked: %s)',
    async (active) => {
      vi.spyOn(CryptoProxy, 'isActiveFor').mockReturnValue(active);
      const saved = vi.fn();
      const rewrap = vi.spyOn(CryptoProxy, 'rewrapUserKey').mockImplementation(async (wrapped, _options, showCode) => {
        await showCode(CODE);
        saved();
        return { encryptedUserKey: wrapped, recoveryCode: CODE };
      });
      const restore = vi
        .spyOn(CryptoProxy, 'rewrapWithRememberedDevice')
        .mockImplementation(async (wrapped, _userId, _publicKey, _options, showCode) => {
          await showCode(CODE);
          saved();
          return { encryptedUserKey: wrapped, recoveryCode: CODE };
        });
      const complete = vi.fn();
      const screen = await render(<StorageAccess initialMode="device-recovery" onSuccess={complete} />);

      await fillNewPassword(screen);
      await screen.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect.element(screen.getByText(CODE, { exact: true })).toBeVisible();
      expect(saved).not.toHaveBeenCalled();

      await confirmCode(screen);
      await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
      expect(saved).toHaveBeenCalledOnce();

      const options = { password: PASSWORD, rotateRecoveryCode: true, repairShare: true };

      if (active) {
        expect(rewrap).toHaveBeenCalledWith(
          mocks.user?.encryptedUserKey,
          options,
          expect.any(Function),
          expect.any(Function),
        );
        expect(restore).not.toHaveBeenCalled();
      } else {
        expect(restore).toHaveBeenCalledWith(
          mocks.user?.encryptedUserKey,
          mocks.user?.id,
          mocks.user?.publicKey,
          options,
          expect.any(Function),
          expect.any(Function),
        );
        expect(rewrap).not.toHaveBeenCalled();
      }
    },
  );

  it('verifies the storage password before rotating recovery without repairing its share', async () => {
    const unlock = vi.spyOn(CryptoProxy, 'unlockWithPassword').mockResolvedValue({ rememberedDevice: 'not_requested' });
    const rewrap = vi.spyOn(CryptoProxy, 'rewrapUserKey').mockImplementation(async (wrapped, _options, showCode) => {
      await showCode(CODE);
      return { encryptedUserKey: wrapped, recoveryCode: CODE };
    });
    const complete = vi.fn();
    const screen = await render(<StorageAccess initialMode="rotate-recovery" onSuccess={complete} />);

    await screen.getByLabelText('Storage password', { exact: true }).fill(PASSWORD);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await confirmCode(screen);
    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());

    expect(unlock).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      mocks.user?.id,
      mocks.user?.publicKey,
      PASSWORD,
      false,
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
    const screen = await render(<StorageAccess initialMode="device-recovery" onSuccess={complete} />);
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();

    await vi.waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(rewrap).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      { password: PASSWORD, rotateRecoveryCode: true, repairShare: true },
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
      await showCode(CODE);
      saved();
      throw new Error('Must not save after the form was closed');
    });
    const complete = vi.fn();
    const screen = await render(<StorageAccess onSuccess={complete} />);
    await fillNewPassword(screen);
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    await screen.rerender(<p>Another page</p>);
    continueSetup();

    await vi.waitFor(() => expect(mocks.refreshSession).toHaveBeenCalled());
    expect(saved).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
});
