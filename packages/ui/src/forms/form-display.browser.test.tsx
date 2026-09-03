import type { FormSnapshotQuestion } from '@comitium/schemas/forms/form-definitions';
import type { FormDefinitionSnapshot, FormSubmissionFile } from '@comitium/schemas/forms/form-submission';
import { TooltipProvider } from '@comitium/ui/tooltip';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { FormDisplay } from './form-display';

const SECTION_ID = '11111111-1111-4111-8111-111111111111';
const PUBLIC_QUESTION_ID = '22222222-2222-4222-8222-222222222222';
const PRIVATE_QUESTION_ID = '33333333-3333-4333-8333-333333333333';
const FILE_QUESTION_ID = '44444444-4444-4444-8444-444444444444';
const FILE_ID = '55555555-5555-4555-8555-555555555555';

function question(
  id: string,
  prompt: string,
  questionType: FormSnapshotQuestion['questionType'],
  isPrivate = false,
): FormSnapshotQuestion {
  return {
    id,
    position: 0,
    questionType,
    prompt,
    description: null,
    isRequired: false,
    isPrivate,
    isLocked: false,
    selectableValues: null,
    config: null,
    visibility: isPrivate ? 'private' : 'standard',
    reusableField: null,
  };
}

const snapshot: FormDefinitionSnapshot = {
  v: 1,
  formId: '66666666-6666-4666-8666-666666666666',
  formClass: 'application',
  title: 'Application',
  capturedAt: '2026-08-28T00:00:00.000Z',
  sections: [
    {
      id: SECTION_ID,
      position: 0,
      title: 'Candidate details',
      questions: [
        question(PUBLIC_QUESTION_ID, 'Public answer', 'short_answer'),
        question(PRIVATE_QUESTION_ID, 'Private answer', 'short_answer', true),
        question(FILE_QUESTION_ID, 'Portfolio', 'file'),
      ],
    },
  ],
};

describe('FormDisplay', () => {
  it('does not render private prompts or answers without private-read access', async () => {
    const screen = await render(
      <FormDisplay
        snapshot={snapshot}
        answers={{
          [PUBLIC_QUESTION_ID]: 'Visible',
          [PRIVATE_QUESTION_ID]: 'Sensitive',
        }}
        canReadPrivate={false}
      />,
    );

    await expect.element(screen.getByText('Public answer')).toBeInTheDocument();
    await expect.element(screen.getByText('Visible')).toBeInTheDocument();
    await expect.element(screen.getByText('Private answer')).not.toBeInTheDocument();
    await expect.element(screen.getByText('Sensitive')).not.toBeInTheDocument();
  });

  it('uses a safe fallback for missing or invalid structured answers', async () => {
    const invalidSnapshot: FormDefinitionSnapshot = {
      ...snapshot,
      sections: [
        {
          ...snapshot.sections[0],
          questions: [question(PUBLIC_QUESTION_ID, 'Candidate score', 'score')],
        },
      ],
    };
    const screen = await render(
      <FormDisplay snapshot={invalidSnapshot} answers={{ [PUBLIC_QUESTION_ID]: { score: 99 } }} />,
    );

    await expect.element(screen.getByText('No answer')).toBeInTheDocument();
  });

  it('downloads the exact file identity and decrypted metadata selected by the user', async () => {
    const onDownload = vi.fn();
    const file = { fileId: FILE_ID, questionId: FILE_QUESTION_ID } as FormSubmissionFile;
    const screen = await render(
      <TooltipProvider>
        <FormDisplay
          snapshot={snapshot}
          answers={{}}
          files={{ [FILE_QUESTION_ID]: file }}
          fileMeta={{
            [FILE_ID]: { fileName: 'portfolio.pdf', mimeType: 'application/pdf', originalSize: 1_024 },
          }}
          onDownloadAttachment={onDownload}
        />
      </TooltipProvider>,
    );

    await screen.getByRole('button', { name: 'Download portfolio.pdf' }).click();

    expect(onDownload).toHaveBeenCalledExactlyOnceWith(FILE_QUESTION_ID, FILE_ID, 'portfolio.pdf', 'application/pdf');
  });
});
