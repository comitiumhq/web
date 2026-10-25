import { TooltipProvider } from '@comitium/ui/tooltip';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { QuestionEditorSheet } from './question-editor-sheet';

it('lets a recruiter explicitly map an application answer to the current title', async () => {
  const submit = vi.fn();
  const screen = await render(
    <TooltipProvider>
      <QuestionEditorSheet
        formClass="application"
        state={{ mode: 'create' }}
        onClose={() => {}}
        onSubmit={submit}
        isPending={false}
      />
    </TooltipProvider>,
  );

  await screen.getByLabelText('Question', { exact: true }).fill('Current role');

  await screen.getByLabelText('Candidate profile field').click();

  await screen.getByRole('option', { name: 'Current title', exact: true }).click();

  await screen.getByRole('button', { name: 'Add question' }).click();

  await vi.waitFor(() => expect(submit).toHaveBeenCalled());

  expect(submit.mock.calls[0][0]).toMatchObject({
    prompt: 'Current role',
    questionType: 'short_answer',
    candidateProfileField: 'current_title',
    isPrivate: false,
  });
});

it('rejects a private answer mapped to a standard profile field', async () => {
  const submit = vi.fn();
  const screen = await render(
    <TooltipProvider>
      <QuestionEditorSheet
        formClass="application"
        state={{ mode: 'create' }}
        onClose={() => {}}
        onSubmit={submit}
        isPending={false}
      />
    </TooltipProvider>,
  );

  await screen.getByLabelText('Question', { exact: true }).fill('Current role');

  await screen.getByLabelText('Candidate profile field').click();

  await screen.getByRole('option', { name: 'Current title', exact: true }).click();

  await screen.getByRole('checkbox', { name: 'Private', exact: true }).click();

  await screen.getByRole('button', { name: 'Add question' }).click();

  await expect.element(screen.getByText('Private answers cannot map to Candidate profile fields')).toBeVisible();

  expect(submit).not.toHaveBeenCalled();
});
