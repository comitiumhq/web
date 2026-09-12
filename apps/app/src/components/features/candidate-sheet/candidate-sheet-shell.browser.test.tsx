import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { CandidateSheetShell } from './candidate-sheet-shell';

describe('CandidateSheetShell', () => {
  it('focuses the sheet container instead of its first action when opened', async () => {
    const screen = await render(
      <CandidateSheetShell
        open
        title="Amina Singh"
        description="Candidate workspace"
        pager={{
          onPrev: vi.fn(),
          onNext: vi.fn(),
          hasPrev: false,
          hasNext: false,
        }}
        onOpenChange={vi.fn()}
      >
        <button type="button">Add tag</button>
      </CandidateSheetShell>,
    );

    await expect.element(screen.getByRole('dialog')).toHaveFocus();
    await expect.element(screen.getByRole('button', { name: 'Add tag' })).not.toHaveFocus();
  });
});
