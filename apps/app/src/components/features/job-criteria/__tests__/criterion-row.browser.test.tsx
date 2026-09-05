import { DragDropProvider } from '@dnd-kit/react';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  MAX_EVALUATION_CRITERION_PROMPT_LENGTH,
  MAX_EVALUATION_CRITERION_TITLE_LENGTH,
} from '@/lib/jobs/evaluation-criteria';
import { CriterionRow } from '../criterion-row';

it('limits criterion title and prompt input lengths', async () => {
  const screen = await render(
    <DragDropProvider>
      <CriterionRow
        id="criterion-1"
        index={0}
        criterion={{
          id: '00000000-0000-4000-8000-000000000001',
          title: 'React experience',
          prompt: 'Has built production React applications.',
        }}
        isExpanded
        onToggle={vi.fn()}
        onUpdate={vi.fn()}
        onRemove={vi.fn()}
      />
    </DragDropProvider>,
  );

  await expect
    .element(screen.getByRole('textbox', { name: 'Title' }))
    .toHaveAttribute('maxlength', String(MAX_EVALUATION_CRITERION_TITLE_LENGTH));
  await expect
    .element(screen.getByRole('textbox', { name: 'Evaluation prompt' }))
    .toHaveAttribute('maxlength', String(MAX_EVALUATION_CRITERION_PROMPT_LENGTH));
});
