import type { CandidateProfile } from '@comitium/schemas/candidates';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { ArchivedApplication } from '@/lib/schemas/pipeline';

import { ArchivedSection } from './archived-section';

const candidateId = '33333333-3333-4333-8333-333333333333';
const profile: CandidateProfile = {
  firstName: 'Amara',
  lastName: 'Okafor',
  email: null,
  phone: null,
  linkedIn: null,
  github: null,
  website: null,
  location: null,
  currentTitle: null,
  currentCompany: null,
};

const rejectedApplication: ArchivedApplication = {
  id: '11111111-1111-4111-8111-111111111111',
  candidateId,
  candidateProfile: null,
  appliedAt: '2026-10-01T12:00:00.000Z',
  terminalOutcome: 'employer_rejected',
  terminalOutcomeAt: '2026-10-22T12:00:00.000Z',
  searchProjection: null,
  criterionSummary: null,
  archivedAt: '2026-10-22T12:00:00.000Z',
  archivedAtStageName: 'Technical Interview',
  archiveReasonId: null,
  archiveReasonLabel: 'Not aligned with role requirements',
  archiveReasonType: 'rejected_by_org',
  tagIds: [],
};

const transferredApplication: ArchivedApplication = {
  ...rejectedApplication,
  id: '22222222-2222-4222-8222-222222222222',
  terminalOutcome: 'transferred',
  archiveReasonLabel: null,
  archiveReasonType: null,
  archivedAtStageName: 'Recruiter Screen',
};

vi.mock('@/hooks/queries/use-query-kanban', () => ({
  useQueryArchivedApplications: () => ({
    archived: [rejectedApplication, transferredApplication],
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
  }),
}));

vi.mock('@/hooks/use-decrypt-candidate-names', () => ({
  useDecryptCandidateNames: () => new Map([[candidateId, profile]]),
}));

describe('ArchivedSection candidate navigation', () => {
  it('opens the clicked Application from row cells or the name when a Candidate has multiple rows', async () => {
    const onCandidateClick = vi.fn();
    const screen = await render(<ArchivedSection jobId="job-id" orgId="org-id" onCandidateClick={onCandidateClick} />);

    await screen.getByText('Not selected', { exact: true }).click();

    expect(onCandidateClick).toHaveBeenLastCalledWith(rejectedApplication.id);

    await screen.getByText('Transferred', { exact: true }).click();

    expect(onCandidateClick).toHaveBeenLastCalledWith(transferredApplication.id);

    await screen.getByText('Amara Okafor', { exact: true }).nth(0).click();

    expect(onCandidateClick).toHaveBeenCalledTimes(3);
    expect(onCandidateClick).toHaveBeenLastCalledWith(rejectedApplication.id);
  });

  it('opens the focused archived Application with Enter and Space', async () => {
    const onCandidateClick = vi.fn();
    const screen = await render(<ArchivedSection jobId="job-id" orgId="org-id" onCandidateClick={onCandidateClick} />);
    const row = screen.getByRole('row', { name: /Amara Okafor Transferred/ });

    row.element().focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onCandidateClick).toHaveBeenCalledTimes(2);
    expect(onCandidateClick).toHaveBeenNthCalledWith(1, transferredApplication.id);
    expect(onCandidateClick).toHaveBeenNthCalledWith(2, transferredApplication.id);
  });
});
