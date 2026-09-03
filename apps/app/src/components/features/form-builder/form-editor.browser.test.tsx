import type { AdminFormDetail } from '@comitium/schemas/forms/form-definitions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

const mocks = vi.hoisted(() => ({
  createForm: vi.fn(),
  form: undefined as AdminFormDetail | undefined,
  onClose: vi.fn(),
  onSaved: vi.fn(),
  updateForm: vi.fn(),
}));

vi.mock('@/hooks/mutations/use-form', () => ({
  useCreateForm: () => ({ mutate: mocks.createForm, isPending: false }),
  useUpdateForm: () => ({ mutate: mocks.updateForm, isPending: false }),
}));

vi.mock('@/hooks/queries/use-query-form', () => ({
  useQueryForm: () => ({ data: mocks.form, isLoading: false, error: null }),
}));

vi.mock('./section-card', () => ({
  SectionCard: ({ section }: { section: { id: string; title: string } }) => (
    <section data-testid={`section-${section.id}`}>{section.title || 'Untitled section'}</section>
  ),
}));

import { FormEditor } from './form-editor';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const FORM_ID = '22222222-2222-4222-8222-222222222222';
const SECTION_ID = '33333333-3333-4333-8333-333333333333';
const QUESTION_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-4555-8555-555555555555';

function existingForm(): AdminFormDetail {
  return {
    form: {
      id: FORM_ID,
      orgId: ORG_ID,
      formClass: 'feedback',
      title: 'Initial scorecard',
      interviewId: null,
      isDefaultForm: false,
      isArchived: false,
      createdBy: USER_ID,
      createdAt: '2026-08-28T00:00:00.000Z',
      updatedAt: '2026-08-28T00:00:00.000Z',
    },
    sections: [
      {
        id: SECTION_ID,
        formId: FORM_ID,
        position: 0,
        title: 'Evaluation',
        questions: [
          {
            id: QUESTION_ID,
            sectionId: SECTION_ID,
            position: 0,
            questionType: 'short_answer',
            prompt: 'Summary',
            description: null,
            isRequired: true,
            isPrivate: false,
            isLocked: false,
            selectableValues: null,
            config: null,
            reusableFieldId: null,
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.form = undefined;
});

describe('FormEditor', () => {
  it('does not duplicate application identity fields that the server seeds', async () => {
    const screen = await render(
      <FormEditor
        orgId={ORG_ID}
        formClass="application"
        formId={null}
        onSaved={mocks.onSaved}
        onClose={mocks.onClose}
      />,
    );

    await screen.getByLabelText('Title').fill('Engineering application');
    await screen.getByRole('button', { name: 'Create form' }).click();

    expect(mocks.createForm).toHaveBeenCalledExactlyOnceWith(
      {
        orgId: ORG_ID,
        body: {
          formClass: 'application',
          title: 'Engineering application',
          sections: [{ title: '', questions: [] }],
        },
      },
      { onSuccess: expect.any(Function) },
    );
  });

  it('preserves server section and question identities when updating a form', async () => {
    mocks.form = existingForm();
    const screen = await render(
      <FormEditor
        orgId={ORG_ID}
        formClass="feedback"
        formId={FORM_ID}
        onSaved={mocks.onSaved}
        onClose={mocks.onClose}
      />,
    );

    await expect.element(screen.getByLabelText('Title')).toHaveValue('Initial scorecard');
    await screen.getByLabelText('Title').fill('Updated scorecard');
    await screen.getByRole('button', { name: 'Save changes' }).click();

    expect(mocks.updateForm).toHaveBeenCalledExactlyOnceWith(
      {
        orgId: ORG_ID,
        formId: FORM_ID,
        body: {
          title: 'Updated scorecard',
          sections: [
            {
              id: SECTION_ID,
              title: 'Evaluation',
              questions: [
                {
                  id: QUESTION_ID,
                  questionType: 'short_answer',
                  prompt: 'Summary',
                  description: undefined,
                  isRequired: true,
                  isPrivate: false,
                  selectableValues: undefined,
                  config: undefined,
                  reusableFieldId: null,
                },
              ],
            },
          ],
        },
      },
      { onSuccess: expect.any(Function) },
    );
  });

  it('does not close over unsaved changes without confirmation', async () => {
    const screen = await render(
      <FormEditor orgId={ORG_ID} formClass="feedback" formId={null} onSaved={mocks.onSaved} onClose={mocks.onClose} />,
    );

    await screen.getByLabelText('Title').fill('Draft scorecard');
    await screen.getByRole('button', { name: 'Cancel' }).click();

    expect(mocks.onClose).not.toHaveBeenCalled();
    await expect.element(screen.getByText('Your unsaved changes will be lost.')).toBeInTheDocument();
    await screen.getByRole('button', { name: 'Discard' }).click();
    expect(mocks.onClose).toHaveBeenCalledOnce();
  });
});
