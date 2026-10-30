import { TooltipProvider } from '@comitium/ui/tooltip';
import { DragDropProvider } from '@dnd-kit/react';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { FormBuilderQuestion } from './question-form';
import { SectionCard, type SectionController } from './section-card';

it('keeps a single section and question editable when reordering is unavailable', async () => {
  const question: FormBuilderQuestion = {
    id: '11111111-1111-4111-8111-111111111111',
    serverId: '11111111-1111-4111-8111-111111111111',
    sectionId: '22222222-2222-4222-8222-222222222222',
    position: 0,
    questionType: 'email',
    prompt: 'Professional contact email',
    description: null,
    isRequired: false,
    isPrivate: true,
    isLocked: false,
    selectableValues: null,
    config: null,
    reusableFieldId: null,
  };
  const controller: SectionController = {
    onTitleChange: vi.fn(),
    onDelete: vi.fn(),
    onQuestionCreate: vi.fn(),
    onQuestionUpdate: vi.fn(),
    onQuestionDelete: vi.fn(),
    onQuestionReorder: vi.fn(),
    isQuestionPending: false,
    isSectionUpdating: false,
    isSectionDeleting: false,
    isQuestionDeleting: false,
  };
  const screen = await render(
    <TooltipProvider>
      <DragDropProvider>
        <SectionCard
          formClass="application"
          section={{ id: question.sectionId, title: 'Additional details', questions: [question] }}
          index={0}
          canDrag={false}
          controller={controller}
        />
      </DragDropProvider>
    </TooltipProvider>,
  );

  await screen.getByRole('textbox', { name: 'Section title (optional)' }).fill('Contact details');
  expect(controller.onTitleChange).toHaveBeenCalled();
  await screen.getByRole('button', { name: 'Question actions' }).click();
  await screen.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect.element(screen.getByRole('textbox', { name: 'Question', exact: true })).toHaveValue(question.prompt);
  await expect.element(screen.getByRole('checkbox', { name: 'Private', exact: true })).toBeChecked();
});
