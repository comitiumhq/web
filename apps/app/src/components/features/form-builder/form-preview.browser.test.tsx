import type { AdminFormDetail } from '@comitium/schemas/forms/form-definitions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

const mocks = vi.hoisted(() => ({
  data: undefined as AdminFormDetail | undefined,
  onClose: vi.fn(),
}));

vi.mock('@/hooks/queries/use-query-form', () => ({
  useQueryForm: () => ({ data: mocks.data, isLoading: false, error: null }),
}));

import { FormPreview, FormPreviewSheet } from './form-preview';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const FORM_ID = '22222222-2222-4222-8222-222222222222';
const SECTION_ID = '33333333-3333-4333-8333-333333333333';

const sections = [
  {
    id: SECTION_ID,
    formId: FORM_ID,
    position: 0,
    title: 'Questions',
    questions: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        sectionId: SECTION_ID,
        position: 0,
        questionType: 'short_answer' as const,
        prompt: 'Summary',
        description: 'Give a short summary.',
        isRequired: true,
        isPrivate: false,
        selectableValues: null,
        config: null,
        reusableFieldId: null,
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        sectionId: SECTION_ID,
        position: 1,
        questionType: 'short_answer' as const,
        prompt: 'Private details',
        description: null,
        isRequired: false,
        isPrivate: true,
        selectableValues: null,
        config: null,
        reusableFieldId: null,
      },
    ],
  },
];

const form: AdminFormDetail['form'] = {
  id: FORM_ID,
  orgId: ORG_ID,
  formClass: 'feedback',
  title: 'Interview feedback',
  interviewId: null,
  isDefaultForm: false,
  isArchived: false,
  createdBy: ORG_ID,
  createdAt: '2026-10-23T00:00:00Z',
  updatedAt: '2026-10-23T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.data = { form, sections };
});

describe('form preview', () => {
  it('keeps the saved form mounted until the closing animation finishes', async () => {
    const animation = `
      @keyframes preview-test-exit { from { opacity: 1; } to { opacity: 0; } }
      [data-slot="sheet-content"][data-state="closed"] { animation: preview-test-exit 500ms linear; }
    `;
    const screen = await render(
      <>
        <style>{animation}</style>
        <FormPreviewSheet orgId={ORG_ID} formId={FORM_ID} onClose={mocks.onClose} />
      </>,
    );
    await expect.element(screen.getByRole('heading', { name: 'Interview feedback' })).toBeVisible();
    await screen.rerender(
      <>
        <style>{animation}</style>
        <FormPreviewSheet orgId={ORG_ID} formId={null} onClose={mocks.onClose} />
      </>,
    );
    await expect.element(screen.getByRole('dialog', { name: 'Form preview' })).toHaveAttribute('data-state', 'closed');
    await expect.element(screen.getByRole('heading', { name: 'Interview feedback' })).toBeInTheDocument();
    await expect.element(screen.getByRole('dialog', { name: 'Form preview' })).not.toBeInTheDocument();
  });

  it('shows private application questions to applicants', async () => {
    const screen = await render(<FormPreview formClass="application" title="Application" sections={sections} />);
    await expect.element(screen.getByText('Private details', { exact: true })).toBeVisible();
  });

  it('shows interviewer fields and hides private questions', async () => {
    const screen = await render(<FormPreview formClass="feedback" title="Interview feedback" sections={sections} />);
    await expect.element(screen.getByText(/^Summary/)).toBeVisible();
    await expect.element(screen.getByText('Private details', { exact: true })).not.toBeInTheDocument();
  });
});
