import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { qk } from '@/hooks/query-keys';
import { EmailVerificationStep } from '../email-verification-step';

const mocks = vi.hoisted(() => ({
  sendVerification: vi.fn(),
  verifyCode: vi.fn(),
}));

vi.mock('@/lib/api/orgs-verification', () => mocks);
vi.mock('@comitium/auth/use-resend-cooldown', () => ({
  useResendCooldown: () => ({ remaining: 0, isActive: false, start: () => {}, reset: () => {} }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.sendVerification.mockResolvedValue({ status: 'sent' });
  mocks.verifyCode.mockResolvedValue({ success: true });
});

async function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <EmailVerificationStep />
    </QueryClientProvider>,
  );
  await screen.getByLabelText('Work email').fill('alex@acme.example');
  await screen.getByRole('button', { name: 'Send verification code' }).click();
  await expect.element(screen.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  return { screen, invalidate };
}

describe('work-email verification', () => {
  it('verifies the entered email and refreshes organization readiness', async () => {
    const { screen, invalidate } = await renderForm();
    expect(mocks.sendVerification).toHaveBeenCalledWith('alex@acme.example');
    await screen.getByLabelText('Verification code', { exact: true }).fill('123456');
    await expect.poll(() => mocks.verifyCode.mock.calls).toEqual([['alex@acme.example', '123456']]);
    await expect.poll(() => invalidate.mock.calls).toEqual([[{ queryKey: qk.orgs.creation() }]]);
  });

  it('shows resend failures on the code step and clears them when going back', async () => {
    const { screen } = await renderForm();
    mocks.sendVerification.mockRejectedValueOnce(new Error('Could not send the verification code.'));
    await screen.getByRole('button', { name: 'Resend code', exact: true }).click();
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Could not send the verification code.');
    await screen.getByRole('button', { name: 'Back', exact: true }).click();
    await expect.element(screen.getByRole('heading', { name: 'Create your organization' })).toBeVisible();
    await expect.element(screen.getByLabelText('Work email')).toHaveValue('alex@acme.example');
    await expect.element(screen.getByRole('alert')).not.toBeInTheDocument();
  });
});
