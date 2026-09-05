import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

vi.mock('react-pdf', () => ({
  Document: () => null,
  Page: () => null,
  pdfjs: { GlobalWorkerOptions: {} },
}));

vi.mock('@/hooks/use-encryption-unlocked', () => ({
  useEncryptionUnlocked: () => ({ isUnlocked: true }),
}));

import { ResumePreview } from './resume-preview';

it('treats an intentionally absent resume as unavailable rather than processing or failed', async () => {
  const screen = await render(
    <ResumePreview
      error="Resume processing failed"
      hasResume={false}
      isLoading
      onDownload={vi.fn()}
      orgId="org-1"
      pdfData={null}
    />,
  );

  await expect.element(screen.getByText('No resume provided.')).toBeInTheDocument();
  await expect.element(screen.getByText('Resume processing failed')).not.toBeInTheDocument();
  await expect.element(screen.getByText('Loading PDF')).not.toBeInTheDocument();
  await expect.element(screen.getByRole('button', { name: 'Download' })).not.toBeInTheDocument();
});
