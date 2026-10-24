import { TooltipProvider } from '@comitium/ui/tooltip';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ApplicationFormPicker } from './application-form-picker';

vi.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('@/hooks/queries/use-query-application-form-options', () => ({
  useQueryApplicationFormOptions: () => ({
    data: { data: [{ id: 'default', title: 'Default application', isDefaultForm: true, sections: [] }] },
  }),
}));

describe('Application form selection', () => {
  it('changes the form only after an explicit selection, never when the picker opens', async () => {
    const onChange = vi.fn();
    const screen = await render(
      <TooltipProvider>
        <ApplicationFormPicker orgId="org" owner={{ kind: 'job', jobId: 'job' }} formId={null} onChange={onChange} />
      </TooltipProvider>,
    );

    const option = screen.getByRole('button', { name: 'Select Default application', exact: true });
    await expect.element(option).toHaveAttribute('aria-pressed', 'false');

    expect(onChange).not.toHaveBeenCalled();
    await option.click();

    expect(onChange).toHaveBeenCalledExactlyOnceWith('default');
  });
});
