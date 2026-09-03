import { AccountSettingsPage } from '@comitium/auth/account-settings';
import type { LinkedAccountWithMetadata, User } from '@privy-io/react-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

interface LinkAccountCallbacks {
  onError?: (error: string, details: { linkMethod: string }) => void;
  onSuccess?: (details: { linkMethod: string }) => void;
}

const mocks = vi.hoisted(() => ({
  googleCallbacks: undefined as LinkAccountCallbacks | undefined,
  linkGoogle: vi.fn(),
  linkWithCode: vi.fn(),
  linkWithPasskey: vi.fn(),
  refreshUser: vi.fn(),
  sendLinkCode: vi.fn(),
  sendUpdateCode: vi.fn(),
  unlinkGoogle: vi.fn(),
  user: null as User | null,
  verifyUpdateCode: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({
  useLinkAccount: (callbacks?: LinkAccountCallbacks) => {
    mocks.googleCallbacks = callbacks;
    return { linkGoogle: mocks.linkGoogle };
  },
  useLinkEmail: () => ({
    linkWithCode: mocks.linkWithCode,
    sendCode: mocks.sendLinkCode,
    state: { status: 'initial' },
  }),
  useLinkWithPasskey: () => ({
    linkWithPasskey: mocks.linkWithPasskey,
    state: { status: 'initial' },
  }),
  useUnlinkOAuth: () => ({ unlink: mocks.unlinkGoogle }),
  useUpdateEmail: () => ({
    sendCode: mocks.sendUpdateCode,
    state: { status: 'initial' },
    verifyCode: mocks.verifyUpdateCode,
  }),
  useUser: () => ({ refreshUser: mocks.refreshUser, user: mocks.user }),
}));

function account(value: Partial<LinkedAccountWithMetadata> & Pick<LinkedAccountWithMetadata, 'type'>) {
  return value as LinkedAccountWithMetadata;
}

function user(...linkedAccounts: LinkedAccountWithMetadata[]) {
  return { linkedAccounts } as User;
}

const email = account({ type: 'email', address: 'person@example.com' });
const google = account({ type: 'google_oauth', email: 'person@gmail.com', subject: 'google-subject' });
const passkey = account({ type: 'passkey', credentialId: 'credential', enrolledInMfa: false });
const wallet = account({
  type: 'wallet',
  address: '0x1234567890abcdef1234567890abcdef12345678',
  chainType: 'ethereum',
  id: 'wallet-id',
  walletClientType: 'privy',
  walletIndex: 0,
});

beforeEach(() => {
  mocks.googleCallbacks = undefined;
  mocks.linkGoogle.mockReset();
  mocks.linkWithCode.mockReset();
  mocks.linkWithCode.mockResolvedValue({ user: {} });
  mocks.linkWithPasskey.mockReset();
  mocks.linkWithPasskey.mockResolvedValue(undefined);
  mocks.refreshUser.mockReset();
  mocks.refreshUser.mockResolvedValue({});
  mocks.sendLinkCode.mockReset();
  mocks.sendLinkCode.mockResolvedValue(undefined);
  mocks.sendUpdateCode.mockReset();
  mocks.sendUpdateCode.mockResolvedValue(undefined);
  mocks.unlinkGoogle.mockReset();
  mocks.unlinkGoogle.mockResolvedValue({});
  mocks.user = user(email, google, passkey);
  mocks.verifyUpdateCode.mockReset();
  mocks.verifyUpdateCode.mockResolvedValue({ user: {} });
});

describe('AccountSettingsPage linked-method controls', () => {
  it('keeps the account sidebar focused on personal account navigation', async () => {
    mocks.user = user(email, wallet);
    const screen = await render(<AccountSettingsPage />);

    await expect.element(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    await expect.element(screen.getByRole('heading', { name: 'Authentication' })).toBeInTheDocument();
    await expect.element(screen.getByText('Manage how you sign in to Comitium.')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Wallet address')).not.toBeInTheDocument();
  });

  it('shows email access guidance on hover', async () => {
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Email access guidance' }).hover();

    await expect
      .element(screen.getByRole('tooltip'))
      .toHaveTextContent('For long-term access, use an email you personally control.');
  });

  it('does not toggle email access guidance on click', async () => {
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Email access guidance' }).click();

    await expect.element(screen.getByRole('tooltip')).not.toBeInTheDocument();
  });

  it('makes adding another linked passkey explicit', async () => {
    const screen = await render(<AccountSettingsPage />);

    await expect.element(screen.getByText('1 passkey')).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Add another' })).toBeEnabled();
  });

  it('requires email OTP as the fallback login method for Google removal', async () => {
    mocks.user = user(google, passkey, wallet);
    const screen = await render(<AccountSettingsPage />);

    await expect.element(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
    await expect.element(screen.getByText('Add an email before removing Google.')).toBeInTheDocument();
  });

  it('links a passkey to the current account and refreshes the user', async () => {
    mocks.user = user(email);
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Add passkey' }).click();

    expect(mocks.linkWithPasskey).toHaveBeenCalledTimes(1);
    expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
  });

  it('adds and verifies an email for a passkey-only account', async () => {
    mocks.user = user(passkey);
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Add email' }).click();
    await screen.getByLabelText('Email address').fill('personal@example.com');
    await screen.getByRole('button', { name: 'Send code' }).click();
    expect(mocks.sendLinkCode).toHaveBeenCalledWith({ email: 'personal@example.com' });

    await screen.getByLabelText('Verification code').fill('123456');
    expect(mocks.linkWithCode).toHaveBeenCalledWith({ code: '123456' });
  });

  it('updates an existing email instead of creating a second account', async () => {
    mocks.user = user(email, passkey);
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Change' }).click();
    await screen.getByLabelText('Email address').fill('new@example.com');
    await screen.getByRole('button', { name: 'Send code' }).click();
    expect(mocks.sendUpdateCode).toHaveBeenCalledWith({ newEmailAddress: 'new@example.com' });

    await screen.getByLabelText('Verification code').fill('654321');
    expect(mocks.verifyUpdateCode).toHaveBeenCalledWith({ code: '654321' });
  });

  it('clears a failed verification attempt before retrying an email change', async () => {
    mocks.verifyUpdateCode.mockRejectedValueOnce(new Error('Invalid code'));
    mocks.user = user(email, passkey);
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Change' }).click();
    await screen.getByLabelText('Email address').fill('new@example.com');
    await screen.getByRole('button', { name: 'Send code' }).click();
    await screen.getByLabelText('Verification code').fill('111111');
    await expect.element(screen.getByRole('alert')).toBeInTheDocument();

    await screen.getByRole('button', { name: 'Change email' }).click();
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Send code' }).click();
    await expect.element(screen.getByLabelText('Verification code')).toHaveValue('');
  });

  it('shows an occupied Google account as a product conflict', async () => {
    mocks.user = user(email);
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Add Google' }).click();
    mocks.googleCallbacks?.onError?.('linked_to_another_user', { linkMethod: 'google' });

    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('This Google account is already used by another Comitium account.');
  });

  it('ignores account-link callbacks from other sign-in methods', async () => {
    mocks.user = user(email);
    const screen = await render(<AccountSettingsPage />);

    mocks.googleCallbacks?.onError?.('unknown', { linkMethod: 'passkey' });
    mocks.googleCallbacks?.onSuccess?.({ linkMethod: 'passkey' });

    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
    expect(mocks.refreshUser).not.toHaveBeenCalled();
  });

  it('confirms Google removal and unlinks the exact linked subject', async () => {
    mocks.user = user(google, email);
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Remove' }).click();
    await screen.getByRole('button', { name: 'Remove Google' }).click();

    expect(mocks.unlinkGoogle).toHaveBeenCalledWith({ provider: 'google', subject: 'google-subject' });
  });

  it('keeps a failed Google removal actionable inside the confirmation dialog', async () => {
    mocks.unlinkGoogle.mockRejectedValueOnce(new Error('Provider unavailable'));
    mocks.user = user(google, email);
    const screen = await render(<AccountSettingsPage />);

    await screen.getByRole('button', { name: 'Remove' }).click();
    await screen.getByRole('button', { name: 'Remove Google' }).click();

    const dialog = screen.getByRole('dialog');
    await expect.element(dialog.getByRole('alert')).toHaveTextContent('We could not remove Google. Try again.');
    await expect.element(dialog.getByRole('button', { name: 'Remove Google' })).toBeEnabled();
  });
});
