import { beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { FeedbackSubmission } from '@/lib/schemas/feedback-submissions';

import { SubmittedRow } from './submitted-row';

const mocks = vi.hoisted(() => ({ deleteSubmission: vi.fn() }));

vi.mock('@/hooks/mutations/use-feedback-submission', () => ({
  useDeleteFeedbackSubmission: () => ({ mutate: mocks.deleteSubmission, isPending: false }),
}));

vi.mock('@/hooks/queries/use-member-avatar', () => ({
  useMemberAvatar: () => null,
}));

vi.mock('@/hooks/use-encryption-unlocked', () => ({
  useEncryptionUnlocked: () => ({ isUnlocked: true }),
}));

const submission: FeedbackSubmission = {
  id: '11111111-1111-4111-8111-111111111111',
  formId: '22222222-2222-4222-8222-222222222222',
  applicationId: '33333333-3333-4333-8333-333333333333',
  activityId: null,
  interviewEventId: null,
  isAdhoc: true,
  formSnapshot: {
    v: 1,
    formId: '22222222-2222-4222-8222-222222222222',
    formClass: 'feedback',
    title: 'Interview feedback',
    capturedAt: '2026-10-24T12:00:00.000Z',
    sections: [],
  },
  answerEnvelopes: [],
  canReadPrivate: false,
  submittedByUserId: '44444444-4444-4444-8444-444444444444',
  submittedAt: '2026-10-24T12:00:00.000Z',
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  sourceLabel: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deleteSubmission.mockImplementation((_variables, options) => options.onSuccess());
});

describe('SubmittedRow', () => {
  it('toggles from the author row and keyboard while edit/delete actions remain independent', async () => {
    const onEdit = vi.fn();
    const screen = await render(
      <SubmittedRow
        submission={submission}
        identity={{ name: 'Ada Lovelace' }}
        entry={{ status: 'ready', values: {} }}
        applicationId={submission.applicationId}
        orgId="org-id"
        isOwn
        onEdit={onEdit}
      />,
    );
    const trigger = screen.getByRole('button', { name: /feedback from Ada Lovelace/ });

    await screen.getByText('Ada Lovelace', { exact: true }).click();

    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');

    trigger.element().focus();
    await userEvent.keyboard('{Enter}');

    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');

    await screen.getByRole('button', { name: 'Feedback actions' }).click();
    await screen.getByRole('menuitem', { name: 'Edit feedback' }).click();

    expect(onEdit).toHaveBeenCalledOnce();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await screen.getByRole('button', { name: 'Feedback actions' }).click();
    await screen.getByRole('menuitem', { name: 'Delete feedback' }).click();

    const dialog = screen.getByRole('dialog', { name: 'Delete feedback?' });

    await expect.element(dialog).toBeVisible();
    expect(mocks.deleteSubmission).not.toHaveBeenCalled();

    await dialog.getByRole('button', { name: 'Cancel' }).click();

    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');

    await screen.getByRole('button', { name: 'Feedback actions' }).click();
    await screen.getByRole('menuitem', { name: 'Delete feedback' }).click();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

    expect(mocks.deleteSubmission).toHaveBeenCalledExactlyOnceWith(
      { applicationId: submission.applicationId, submissionId: submission.id },
      { onSuccess: expect.any(Function) },
    );
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(dialog).not.toBeInTheDocument();
  });

  it('keeps another reviewer’s feedback expandable without edit/delete actions', async () => {
    const onEdit = vi.fn();
    const screen = await render(
      <SubmittedRow
        submission={submission}
        identity={{ name: 'Ada Lovelace' }}
        entry={{ status: 'ready', values: {} }}
        applicationId={submission.applicationId}
        orgId="org-id"
        isOwn={false}
        onEdit={onEdit}
      />,
    );
    const trigger = screen.getByRole('button', { name: /feedback from Ada Lovelace/ });

    expect(screen.getByRole('button', { name: 'Feedback actions' }).query()).toBeNull();

    await screen.getByText('Ada Lovelace', { exact: true }).click();

    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(onEdit).not.toHaveBeenCalled();
    expect(mocks.deleteSubmission).not.toHaveBeenCalled();
  });
});
