import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { StorageForm } from '../storage/storage-form';

describe('new password strength feedback', () => {
  it.each(['setup', 'change', 'recovery'] as const)('submits an eight-character password in %s mode', async (mode) => {
    const onSubmit = vi.fn(async () => {});
    const screen = await render(<StorageForm mode={mode} pending={false} error={null} onSubmit={onSubmit} />);
    const password = 'Q7#m2Vz!';
    const currentPassword = mode === 'change' ? 'current-password' : '';

    if (mode === 'change') {
      await screen.getByLabelText('Current password', { exact: true }).fill(currentPassword);
    }

    await screen.getByLabelText(mode === 'setup' ? 'Password' : 'New password', { exact: true }).fill(password);
    await screen.getByLabelText('Confirm password', { exact: true }).fill(password);
    await screen.getByRole('button', { name: mode === 'setup' ? 'Continue' : 'Change password', exact: true }).click();

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ password, currentPassword, recoveryCode: '' }),
    );
  });

  it('updates as the user types and keeps the confirmation field separate', async () => {
    const screen = await render(<StorageForm mode="setup" pending={false} error={null} onSubmit={async () => {}} />);
    const password = screen.getByLabelText('Password', { exact: true });

    await expect.element(screen.getByText('This password protects your encrypted data.')).toBeVisible();
    await expect.element(screen.getByRole('meter')).toHaveAttribute('value', '0');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Not entered');
    await expect.element(password).toHaveAttribute('aria-describedby');
    await expect.element(screen.getByText('At least 8 characters.')).not.toBeInTheDocument();

    await password.fill('short');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Use at least 8 characters.');

    await password.fill('password123456');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Weak');

    await password.fill('Q7#m2Vz!');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Fair');

    await password.fill('G6v!m2Qr9#tL8sZ4');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Strong');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('value', '4');
    await expect.element(password).toHaveAttribute('type', 'password');
    await expect.element(password).toHaveFocus();

    await screen.getByLabelText('Confirm password', { exact: true }).fill('different');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Strong');

    await password.fill('');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('value', '0');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Not entered');
    await expect.element(password).toHaveAttribute('aria-describedby');
  });

  it('does not rate existing passwords during unlock', async () => {
    const screen = await render(<StorageForm mode="unlock" pending={false} error={null} onSubmit={async () => {}} />);

    await screen.getByLabelText('Password', { exact: true }).fill('password123456');
    await expect.element(screen.getByRole('meter')).not.toBeInTheDocument();
  });

  it('does not show an acceptable rating for short or oversized passwords', async () => {
    const screen = await render(<StorageForm mode="setup" pending={false} error={null} onSubmit={async () => {}} />);
    const password = screen.getByLabelText('Password', { exact: true });

    await password.fill('jG7!zQ2');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Use at least 8 characters.');
    await expect.element(screen.getByRole('meter')).toHaveAttribute('value', '2');

    await password.fill('é'.repeat(513));
    await expect.element(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', 'Password is too long.');
  });
});
