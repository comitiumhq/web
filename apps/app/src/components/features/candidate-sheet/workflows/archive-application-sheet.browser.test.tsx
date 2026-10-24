import { TooltipProvider } from '@comitium/ui/tooltip';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { ArchiveApplicationSheet } from './archive-application-sheet';

const mocks = vi.hoisted(() => ({ submit: vi.fn() }));

const reasons = [
  { id: 'experience', label: 'Insufficient experience', outcome: 'employer_rejected' },
  { id: 'skills', label: 'Missing required skills', outcome: 'employer_rejected' },
  { id: 'withdrew', label: 'Accepted another offer', outcome: 'candidate_withdrew' },
];

vi.mock('@/hooks/queries/use-query-archive-reasons-list', () => ({
  useQueryArchiveReasonsList: () => ({ data: { data: reasons }, isLoading: false, isError: false }),
}));

vi.mock('@/hooks/queries/use-query-email-templates', () => ({
  useQueryApplicationEmailTemplateOptions: () => ({
    data: [
      {
        id: 'update',
        name: 'Application update',
        subject: 'Update for {{candidate_first_name}}',
        body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thank you.' }] }] },
        useCase: 'general',
        isArchived: false,
      },
    ],
    isError: false,
  }),
}));

vi.mock('@/hooks/queries/use-query-org', () => ({
  useQueryOrg: () => ({ data: { name: 'Example company' } }),
}));

vi.mock('@/hooks/use-permissions', () => ({
  useQueryOrgMe: () => ({ data: { name: 'Recruiter', emailSignature: null } }),
}));

function ArchiveHarness({ candidateEmail = 'candidate@example.com' }: { candidateEmail?: string | null }) {
  const [open, setOpen] = useState(true);

  return (
    <TooltipProvider>
      <button type="button" onClick={() => setOpen(true)}>
        Open archive
      </button>
      <ArchiveApplicationSheet
        open={open}
        onOpenChange={setOpen}
        onSubmit={mocks.submit}
        isPending={false}
        applicationId="application"
        orgId="org"
        candidateEmail={candidateEmail}
        candidateFirstName="Candidate"
        jobTitle="Engineer"
        canSendEmail
      />
    </TooltipProvider>
  );
}

async function chooseReason(label: string) {
  await page.getByRole('button', { name: 'Show archive reason options' }).click();
  await page.getByRole('option', { name: label }).click();
}

async function fillMessage(text: string) {
  const editor = page.getByRole('dialog').element().querySelector('[contenteditable="true"]');

  if (!editor) {
    throw new Error('Email editor is missing');
  }

  await page.elementLocator(editor).fill(text);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Archive application', () => {
  it('keeps the selected reason when its search text is cleared', async () => {
    const screen = await render(<ArchiveHarness />);

    await chooseReason('Insufficient experience');

    const reason = screen.getByRole('combobox', { name: 'Archive reason' });

    await screen.getByRole('button', { name: 'Show archive reason options' }).click();
    await reason.fill('');
    await userEvent.keyboard('{Escape}');

    await expect.element(reason).toHaveValue('Insufficient experience');
    await expect.element(screen.getByText('Please select a reason')).not.toBeInTheDocument();
  });

  it('keeps the email opt-in and independent of the selected reason', async () => {
    const screen = await render(<ArchiveHarness />);

    await expect.element(screen.getByRole('button', { name: 'Archive', exact: true })).toBeDisabled();
    await chooseReason('Insufficient experience');

    await expect.element(screen.getByRole('checkbox', { name: 'Send email' })).not.toBeChecked();
    await expect.element(screen.getByRole('checkbox', { name: 'Send email' })).toBeEnabled();
    await expect.element(screen.getByRole('textbox', { name: 'Subject', exact: true })).not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Archive', exact: true }).click();

    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith({
      action: 'archive',
      archiveReasonId: 'experience',
      notice: null,
    });
  });

  it('preserves the email draft when collapsed or when the reason changes', async () => {
    const screen = await render(<ArchiveHarness />);

    await chooseReason('Insufficient experience');
    await screen.getByRole('checkbox', { name: 'Send email' }).click();
    await screen.getByRole('button', { name: 'Show email template options' }).click();
    await screen.getByRole('option', { name: 'Application update', exact: true }).click();

    await expect
      .element(screen.getByRole('textbox', { name: 'Subject', exact: true }))
      .toHaveValue('Update for Candidate');
    await screen.getByRole('textbox', { name: 'Subject', exact: true }).fill('Application update');
    await fillMessage('Thank you for your time.');
    await screen.getByRole('checkbox', { name: 'Send email' }).click();

    await expect.element(screen.getByRole('textbox', { name: 'Subject', exact: true })).not.toBeInTheDocument();
    await chooseReason('Accepted another offer');
    await screen.getByRole('checkbox', { name: 'Send email' }).click();

    await expect
      .element(screen.getByRole('textbox', { name: 'Subject', exact: true }))
      .toHaveValue('Application update');
    await expect.element(screen.getByText('Thank you for your time.', { exact: true })).toBeVisible();
    await expect
      .element(screen.getByRole('combobox', { name: 'Email template', exact: true }))
      .toHaveValue('Application update');
    await chooseReason('Missing required skills');

    await expect
      .element(screen.getByRole('textbox', { name: 'Subject', exact: true }))
      .toHaveValue('Application update');
    await expect.element(screen.getByText('Thank you for your time.', { exact: true })).toBeVisible();
    await screen.getByRole('checkbox', { name: 'Send email' }).click();
    await screen.getByRole('button', { name: 'Archive', exact: true }).click();

    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith({
      action: 'archive',
      archiveReasonId: 'skills',
      notice: null,
    });
  });

  it('archives a withdrawal without requiring an email', async () => {
    const screen = await render(<ArchiveHarness />);

    await expect.element(screen.getByRole('button', { name: 'Archive', exact: true })).toBeDisabled();
    await chooseReason('Accepted another offer');
    await screen.getByRole('button', { name: 'Archive', exact: true }).click();

    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith({
      action: 'archive',
      archiveReasonId: 'withdrew',
      notice: null,
    });
  });

  it('submits the reviewed optional email together with the archive', async () => {
    const screen = await render(<ArchiveHarness />);

    await chooseReason('Accepted another offer');
    await screen.getByRole('checkbox', { name: 'Send email', exact: true }).click();
    await screen.getByRole('textbox', { name: 'Subject', exact: true }).fill('Thank you');
    await fillMessage('All the best in your new role.');
    await screen.getByRole('button', { name: 'Archive', exact: true }).click();

    expect(mocks.submit).toHaveBeenCalledExactlyOnceWith({
      action: 'archive',
      archiveReasonId: 'withdrew',
      notice: expect.objectContaining({
        subject: 'Thank you',
        messageHtml: expect.stringContaining('All the best in your new role.'),
      }),
    });
  });

  it('allows archiving without a recipient while disabling email', async () => {
    const screen = await render(<ArchiveHarness candidateEmail={null} />);

    await chooseReason('Insufficient experience');

    await expect.element(screen.getByRole('checkbox', { name: 'Send email' })).toBeDisabled();
    await expect.element(screen.getByRole('button', { name: 'Archive', exact: true })).toBeEnabled();
  });

  it('starts with an empty reason and email choice after closing and reopening', async () => {
    const screen = await render(<ArchiveHarness />);

    await chooseReason('Insufficient experience');
    await screen.getByRole('checkbox', { name: 'Send email' }).click();
    await screen.getByRole('textbox', { name: 'Subject', exact: true }).fill('Discarded subject');
    await fillMessage('Discarded message.');
    await screen.getByRole('button', { name: 'Cancel', exact: true }).click();
    await screen.getByRole('button', { name: 'Open archive', exact: true }).click();

    await expect.element(screen.getByRole('combobox', { name: 'Archive reason' })).toHaveValue('');
    await expect.element(screen.getByRole('checkbox', { name: 'Send email', exact: true })).not.toBeChecked();
    await expect.element(screen.getByRole('button', { name: 'Archive', exact: true })).toBeDisabled();
    await screen.getByRole('checkbox', { name: 'Send email' }).click();

    await expect.element(screen.getByRole('textbox', { name: 'Subject', exact: true })).toHaveValue('');
    await expect.element(screen.getByText('Discarded message.')).not.toBeInTheDocument();
  });
});
