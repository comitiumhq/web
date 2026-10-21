import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { RecoveryCodeStep } from '../storage/recovery/recovery-code-step';

const mocks = vi.hoisted(() => ({
  createRecoveryKit: vi.fn(),
  download: vi.fn(),
}));

vi.mock('../storage/recovery/recovery-kit-pdf', () => ({ createRecoveryKit: mocks.createRecoveryKit }));
vi.mock('@comitium/ui/download', () => ({ triggerFileDownload: mocks.download }));

const CODE = 'ABCD-EFGH-JKLM-NPQR-STVW-XY23-45';

beforeEach(() => {
  mocks.createRecoveryKit.mockReset();
  mocks.download.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe('recovery code', () => {
  it('copies the exact code and still requires explicit confirmation that it is saved', async () => {
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const confirm = vi.fn();
    const screen = await render(<RecoveryCodeStep code={CODE} onConfirm={confirm} onCancel={vi.fn()} />);

    await screen.getByRole('button', { name: 'Copy recovery code', exact: true }).click();
    expect(copy).toHaveBeenCalledWith(CODE);
    await expect.element(screen.getByRole('button', { name: 'Copied', exact: true })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();

    await screen.getByLabelText('I saved my recovery code').click();
    await screen.getByRole('button', { name: 'Continue', exact: true }).click();
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('downloads the PDF kit without confirming or replacing the displayed recovery code', async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    const confirm = vi.fn();
    mocks.createRecoveryKit.mockResolvedValue(bytes);
    const screen = await render(<RecoveryCodeStep code={CODE} onConfirm={confirm} onCancel={vi.fn()} />);

    await screen.getByRole('button', { name: 'Download recovery kit', exact: true }).click();
    await vi.waitFor(() =>
      expect(mocks.download).toHaveBeenCalledWith(bytes, 'comitium-recovery-kit.pdf', 'application/pdf'),
    );
    expect(mocks.createRecoveryKit).toHaveBeenCalledWith(CODE);
    await expect.element(screen.getByRole('heading', { name: 'Save your recovery kit' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('shows a manually selectable code if clipboard access fails', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Clipboard denied'));
    const screen = await render(<RecoveryCodeStep code={CODE} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    await screen.getByRole('button', { name: 'Copy recovery code', exact: true }).click();
    await expect.element(screen.getByText(CODE, { exact: true })).toBeVisible();
    await expect.element(screen.getByRole('alert')).toHaveTextContent('Select the code');
  });

  it('keeps saving on the same step and disables edits until the write completes', async () => {
    const screen = await render(<RecoveryCodeStep code={CODE} saving onConfirm={vi.fn()} onCancel={vi.fn()} />);
    await expect.element(screen.getByRole('button', { name: 'Saving…', exact: true })).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: 'Download recovery kit', exact: true })).toBeDisabled();
    await expect.element(screen.getByLabelText('I saved my recovery code')).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: 'Back', exact: true })).toBeDisabled();
  });

  it('keeps the same code available to copy when PDF generation fails', async () => {
    mocks.createRecoveryKit.mockRejectedValue(new Error('PDF generation failed'));
    const confirm = vi.fn();
    const screen = await render(<RecoveryCodeStep code={CODE} onConfirm={confirm} onCancel={vi.fn()} />);

    await screen.getByRole('button', { name: 'Download recovery kit', exact: true }).click();
    await expect
      .element(screen.getByRole('alert'))
      .toHaveTextContent('Could not download the PDF. Copy the code instead.');
    await expect.element(screen.getByRole('heading', { name: 'Save your recovery kit' })).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Copy recovery code', exact: true })).toBeEnabled();
    expect(confirm).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    await screen.getByRole('button', { name: 'Copy recovery code', exact: true }).click();
    expect(copy).toHaveBeenCalledWith(CODE);
  });
});
