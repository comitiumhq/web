import { CryptoProxy } from '@comitium/crypto';
import type { User } from '@comitium/schemas/auth';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { AccountSettingsLayout } from '../account-settings/account-settings-layout';
import { RecoverySettingsPage } from '../account-settings/recovery/recovery-settings-page';
import { encryptedProductUser, identitySession, productUser } from './identity-fixtures';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  isCryptoActive: true,
  confirmFreshAuthentication: vi.fn().mockResolvedValue(undefined),
}));
const PASSWORD = 'A long storage password for this test';
const CODE = 'ABCD-EFGH-JKLM-NPQR-STVW-XY23-45';

vi.mock('../use-session', () => ({ useSession: () => ({ user: mocks.user }) }));
vi.mock('../auth-context', () => ({
  useAuthClient: () => ({ useSession: () => ({ data: identitySession() }) }),
}));
vi.mock('../use-crypto-unlock', () => ({
  useCryptoUnlock: () => ({ isCryptoActive: mocks.isCryptoActive, refreshAccount: async () => {} }),
}));
vi.mock('../fresh-authentication', () => ({
  useConfirmFreshAuthentication: () => mocks.confirmFreshAuthentication,
}));

beforeEach(() => {
  mocks.user = encryptedProductUser();
  mocks.isCryptoActive = true;
  mocks.confirmFreshAuthentication.mockClear();
});

afterEach(() => vi.restoreAllMocks());

async function renderSettings() {
  const rootRoute = createRootRoute({
    component: () => (
      <AccountSettingsLayout>
        <Outlet />
      </AccountSettingsLayout>
    ),
  });
  const recoveryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/account/recovery',
    component: RecoverySettingsPage,
  });
  const authenticationRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/account',
    component: () => <h1>Authentication</h1>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([recoveryRoute, authenticationRoute]),
    history: createMemoryHistory({ initialEntries: ['/account/recovery'] }),
  });

  await router.load();

  const screen = await render(<RouterProvider router={router} />);

  return { router, screen };
}

function removeRecoveryCode() {
  const user = encryptedProductUser();

  mocks.user = {
    ...user,
    encryptedUserKey: {
      ...user.encryptedUserKey,
      wraps: user.encryptedUserKey.wraps.filter((wrap) => wrap.method === 'password'),
    },
  };
}

describe('recovery settings', () => {
  it('hides Recovery for keyless accounts and redirects a direct visit to Authentication', async () => {
    mocks.user = productUser();

    const { router, screen } = await renderSettings();

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/account'));
    await expect.element(screen.getByRole('heading', { name: 'Authentication', exact: true })).toBeVisible();
    await expect.element(screen.getByRole('link', { name: 'Recovery', exact: true })).not.toBeInTheDocument();
    await expect.element(screen.getByRole('heading', { name: 'Password and recovery' })).not.toBeInTheDocument();
  });

  it('unlocks locked keys before creating a recovery code', async () => {
    removeRecoveryCode();
    mocks.isCryptoActive = false;

    vi.spyOn(CryptoProxy, 'isActiveFor').mockReturnValue(false);

    const unlock = vi.spyOn(CryptoProxy, 'unlockWithPassword').mockResolvedValue({ rememberedDevice: 'remembered' });
    const saved = vi.fn();

    const rewrap = vi.spyOn(CryptoProxy, 'rewrapUserKey').mockImplementation(async (wrapped, _options, showCode) => {
      await showCode(CODE);

      saved();

      return { encryptedUserKey: wrapped, recoveryCode: CODE };
    });

    const { screen } = await renderSettings();

    await screen.getByRole('button', { name: 'Create recovery code' }).click();

    const dialog = screen.getByRole('dialog', { name: 'Create a recovery code' });

    await dialog.getByLabelText('Current password', { exact: true }).fill(PASSWORD);
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

    const kit = screen.getByRole('dialog', { name: 'Save your recovery kit' });

    await expect.element(kit).toBeVisible();
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
    expect(saved).not.toHaveBeenCalled();

    await kit.getByLabelText('I saved my recovery code').click();
    await kit.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    expect(saved).toHaveBeenCalledOnce();
  });

  it('starts locked recovery with the code and returns to password change with Back', async () => {
    mocks.isCryptoActive = false;

    const { screen } = await renderSettings();

    await screen.getByRole('button', { name: 'Change password', exact: true }).click();
    await screen.getByRole('button', { name: 'Forgot password?' }).click();

    const dialog = screen.getByRole('dialog', { name: 'Enter your recovery code' });

    await expect.element(dialog.getByLabelText('Recovery code', { exact: true })).toHaveFocus();
    await expect.element(dialog.getByLabelText('New password', { exact: true })).not.toBeInTheDocument();

    await dialog.getByRole('button', { name: 'Back', exact: true }).click();

    await expect.element(screen.getByRole('dialog', { name: 'Change your password' })).toBeVisible();
  });

  it('cancels a replacement before saving when its kit dialog is closed', async () => {
    const verify = vi.spyOn(CryptoProxy, 'verifyPassword');
    const unlock = vi.spyOn(CryptoProxy, 'unlockWithPassword');

    const saved = vi.fn();
    const rewrap = vi
      .spyOn(CryptoProxy, 'rewrapUserKey')
      .mockImplementation(async (wrapped, _options, showCode, confirmFreshAuth) => {
        await confirmFreshAuth();
        await showCode(CODE);

        saved();

        return { encryptedUserKey: wrapped, recoveryCode: CODE };
      });
    const { screen } = await renderSettings();

    await screen.getByRole('button', { name: 'Replace recovery code' }).click();

    const dialog = screen.getByRole('dialog', { name: 'Save your recovery kit' });

    await expect.element(dialog.getByLabelText('Current password', { exact: true })).not.toBeInTheDocument();
    await expect.element(dialog.getByLabelText('I saved my recovery code')).not.toBeChecked();
    expect(mocks.confirmFreshAuthentication).toHaveBeenCalledOnce();
    expect(verify).not.toHaveBeenCalled();
    expect(unlock).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();

    await dialog.getByRole('button', { name: 'Close', exact: true }).click();

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Replace recovery code' })).toHaveFocus();
    expect(rewrap).toHaveBeenCalledOnce();
    expect(saved).not.toHaveBeenCalled();
  });

  it('saves a new recovery code without a password only after acknowledgment', async () => {
    removeRecoveryCode();

    let finishSave = () => {};
    const saved = vi.fn();
    const rewrap = vi
      .spyOn(CryptoProxy, 'rewrapUserKey')
      .mockImplementation(async (wrapped, _options, showCode, confirmFreshAuth) => {
        await confirmFreshAuth();
        await showCode(CODE);

        saved();

        await new Promise<void>((resolve) => {
          finishSave = resolve;
        });

        return { encryptedUserKey: wrapped, recoveryCode: CODE };
      });
    const { screen } = await renderSettings();
    const action = 'Create recovery code';

    await screen.getByRole('button', { name: action }).click();

    const dialog = screen.getByRole('dialog', { name: 'Save your recovery kit' });

    await expect.element(dialog.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    expect(saved).not.toHaveBeenCalled();

    await dialog.getByLabelText('I saved my recovery code').click();
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect.element(dialog.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    await expect.element(dialog.getByRole('button', { name: 'Close', exact: true })).not.toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await expect.element(dialog).toBeVisible();

    finishSave();

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: action })).toBeEnabled();
    expect(saved).toHaveBeenCalledOnce();
    expect(mocks.confirmFreshAuthentication).toHaveBeenCalledOnce();
    expect(rewrap).toHaveBeenCalledWith(
      mocks.user?.encryptedUserKey,
      { rotateRecoveryCode: true, repairShare: false },
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('keeps recovery-code creation available after a failed request', async () => {
    vi.spyOn(CryptoProxy, 'rewrapUserKey').mockRejectedValue(new TypeError('Failed to fetch'));

    const { screen } = await renderSettings();

    await screen.getByRole('button', { name: 'Replace recovery code' }).click();

    await expect.element(screen.getByRole('alert')).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Replace recovery code' })).toBeEnabled();
    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps a pending password change open until the save completes', async () => {
    vi.spyOn(CryptoProxy, 'isActiveFor').mockReturnValue(true);
    vi.spyOn(CryptoProxy, 'verifyPassword').mockResolvedValue(undefined);

    let finishSave = () => {};

    vi.spyOn(CryptoProxy, 'rewrapUserKey').mockImplementation(
      (wrapped) =>
        new Promise((resolve) => {
          finishSave = () => resolve({ encryptedUserKey: wrapped, recoveryCode: null });
        }),
    );

    const { screen } = await renderSettings();

    await screen.getByRole('button', { name: 'Change password', exact: true }).click();
    await screen.getByLabelText('Current password', { exact: true }).fill(PASSWORD);
    await screen.getByLabelText('New password', { exact: true }).fill(PASSWORD);
    await screen.getByLabelText('Confirm password', { exact: true }).fill(PASSWORD);
    await screen.getByRole('button', { name: 'Change password', exact: true }).click();

    const dialog = screen.getByRole('dialog', { name: 'Change your password' });

    await expect.element(dialog.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
    await expect.element(dialog.getByRole('button', { name: 'Close', exact: true })).not.toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await expect.element(dialog).toBeVisible();

    finishSave();

    await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  });
});
