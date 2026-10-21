import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { qk } from '@/hooks/query-keys';
import type { OrgCreationStatus } from '@/lib/schemas/org';
import { CreateOrg } from '..';

const mocks = vi.hoisted(() => ({
  createOrg: vi.fn(),
  getOrgCreationStatus: vi.fn(),
}));

vi.mock('@/lib/api/orgs-creation', () => mocks);
vi.mock('@comitium/auth/use-session', () => ({
  useSession: () => ({ isSignedIn: true, user: { id: 'user-1' } }),
}));
vi.mock('@comitium/crypto/key-bundle', () => ({ hasEncryptionKeyBundle: () => true }));
vi.mock('../email-verification-step', () => ({
  EmailVerificationStep: () => <p>Verify your work email</p>,
}));

const READY: OrgCreationStatus = { status: 'ready', domain: 'acme.example', email: 'owner@acme.example' };
const CREATED: OrgCreationStatus = {
  status: 'created',
  organizationId: 'org-1',
  hasActiveMembership: true,
};
let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrgCreationStatus.mockResolvedValue(READY);
  mocks.createOrg.mockResolvedValue({ state: 'completed', organizationId: 'org-1' });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

afterEach(() => queryClient.clear());

function renderPage() {
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <CreateOrg />
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe('automatic organization creation', () => {
  it('waits for verification, then creates once without another confirmation, including in StrictMode', async () => {
    queryClient.setQueryData<OrgCreationStatus>(qk.orgs.creation(), { status: 'needs_verification' });
    mocks.createOrg.mockReturnValue(new Promise(() => {}));
    const screen = await renderPage();

    await expect.element(screen.getByText('Verify your work email')).toBeVisible();
    expect(mocks.createOrg).not.toHaveBeenCalled();

    queryClient.setQueryData(qk.orgs.creation(), READY);

    await expect.element(screen.getByRole('region', { name: 'Creating organization' })).toBeInTheDocument();
    expect(mocks.createOrg).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByRole('button', { name: 'Create organization' })).not.toBeInTheDocument();

    await queryClient.invalidateQueries({ queryKey: qk.orgs.creation() });
    expect(mocks.createOrg).toHaveBeenCalledTimes(1);
  });

  it('keeps failed creation retryable without automatically repeating the request', async () => {
    mocks.createOrg.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const screen = await renderPage();

    await expect.element(screen.getByRole('region', { name: 'Organization creation failed' })).toBeVisible();
    expect(mocks.createOrg).toHaveBeenCalledTimes(1);

    await queryClient.invalidateQueries({ queryKey: qk.orgs.creation() });
    expect(mocks.createOrg).toHaveBeenCalledTimes(1);

    await screen.getByRole('button', { name: 'Try again' }).click();

    await expect.poll(() => queryClient.getQueryData(qk.orgs.creation())).toEqual(CREATED);
    expect(mocks.createOrg).toHaveBeenCalledTimes(2);
    await expect.element(screen.getByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('recognizes creation after a lost response instead of asking to create again', async () => {
    mocks.getOrgCreationStatus.mockResolvedValueOnce(READY).mockResolvedValue(CREATED);
    mocks.createOrg.mockRejectedValue(new TypeError('Response lost'));
    const screen = await renderPage();

    await expect.poll(() => queryClient.getQueryData(qk.orgs.creation())).toEqual(CREATED);
    expect(mocks.createOrg).toHaveBeenCalledTimes(1);
    await expect.element(screen.getByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
