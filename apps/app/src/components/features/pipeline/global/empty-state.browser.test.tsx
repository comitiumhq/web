import { TooltipProvider } from '@comitium/ui/tooltip';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DashboardEmptyState } from './empty-state';

it('shows the Pipeline create action as disabled when organization setup blocks it', async () => {
  const screen = await render(
    <TooltipProvider>
      <DashboardEmptyState
        isAdmin
        onCreateJob={vi.fn()}
        createJobDisabledReason="Complete company details, department, location, and privacy settings first."
      />
    </TooltipProvider>,
  );

  await expect.element(screen.getByRole('button', { name: 'New Job' })).toHaveAttribute('aria-disabled', 'true');
});
