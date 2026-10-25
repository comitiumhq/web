import { createCandidateProfile } from '@comitium/schemas/candidates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { mockVaultAccess } from '@/test/crypto-helpers';
import { CandidateProfileCard } from './candidate-profile-card';
import { CandidateProfileEditSheet } from './candidate-profile-edit-sheet';

const mocks = vi.hoisted(() => ({ update: vi.fn() }));

vi.mock('@/hooks/mutations/use-update-candidate-profile', () => ({
  useUpdateCandidateProfile: () => ({ mutateAsync: mocks.update, isPending: false }),
}));

vi.mock('@/hooks/use-encryption-unlocked', () => ({
  useEncryptionUnlocked: () => ({ isUnlocked: true, runUnlocked: (action: () => void) => action() }),
}));

const profile = createCandidateProfile({
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+123',
  linkedIn: null,
  github: null,
  website: null,
  location: null,
  currentTitle: null,
  currentCompany: null,
});

const access = mockVaultAccess();
const close = vi.fn();
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function view(current = profile, revision = 1) {
  return (
    <QueryClientProvider client={client}>
      <CandidateProfileEditSheet
        open
        onOpenChange={close}
        candidateId="candidate-1"
        orgId="org-1"
        profile={current}
        profileRevision={revision}
        vaultPublicKey={access.vaultPublicKey}
        vaultKeyVersion={access.vaultKeyVersion}
        vaultAccess={access}
      />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mocks.update.mockReset().mockResolvedValue({ success: true, profileRevision: 2 });
  close.mockClear();
  client.clear();
});

it('keeps unsaved edits and original CAS revision while a background profile arrives', async () => {
  const screen = await render(view());

  await screen.getByLabelText('Phone', { exact: true }).fill('');

  await screen.getByLabelText('Website', { exact: true }).fill('example.com/about');

  await screen.rerender(view({ ...profile, phone: '+777', currentTitle: 'Background title' }, 2));

  await expect.element(screen.getByLabelText('Phone', { exact: true })).toHaveValue('');

  await screen.getByRole('button', { name: 'Save changes' }).click();

  await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());

  expect(mocks.update.mock.calls[0][0]).toMatchObject({
    expectedProfileRevision: 1,
    profile: {
      phone: null,
      currentTitle: null,
      website: 'https://example.com/about',
      manuallyClearedFields: ['phone'],
    },
  });
});

it('rejects unsafe URL schemes before encryption', async () => {
  const screen = await render(view());

  await screen.getByLabelText('Website', { exact: true }).fill('javascript:alert(1)');

  await screen.getByRole('button', { name: 'Save changes' }).click();

  await expect.element(screen.getByText('Enter an HTTP(S) URL')).toBeVisible();

  expect(mocks.update).not.toHaveBeenCalled();
});

it('keeps the open editor and its CAS baseline while the card decrypts a background update', async () => {
  const card = (loading: boolean, revision: number | null, current: typeof profile | null) => (
    <QueryClientProvider client={client}>
      <CandidateProfileCard
        candidateId="candidate-1"
        orgId="org-1"
        profile={current}
        profileRevision={revision}
        isLoading={loading}
        hasEncryptedProfile
        queryError={false}
        decryptionError={false}
        onRetry={vi.fn()}
        canEdit
        vaultPublicKey={access.vaultPublicKey}
        vaultKeyVersion={access.vaultKeyVersion}
        vaultAccess={access}
      />
    </QueryClientProvider>
  );
  const screen = await render(card(false, 1, profile));

  await screen.getByRole('button', { name: 'Edit', exact: true }).click();
  await screen.getByLabelText('Phone', { exact: true }).fill('+555');
  await screen.rerender(card(true, null, null));
  await expect.element(screen.getByLabelText('Phone', { exact: true })).toHaveValue('+555');
  await screen.rerender(card(false, 2, { ...profile, phone: '+777' }));
  await expect.element(screen.getByLabelText('Phone', { exact: true })).toHaveValue('+555');
  await screen.getByRole('button', { name: 'Save changes' }).click();
  await vi.waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
  expect(mocks.update.mock.calls[0][0]).toMatchObject({ expectedProfileRevision: 1, profile: { phone: '+555' } });
});
