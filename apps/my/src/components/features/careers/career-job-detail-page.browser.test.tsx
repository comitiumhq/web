import { CareerJobDetailPage } from '@comitium/jobs/careers';
import type { CareerJob } from '@comitium/jobs/schemas';
import { TooltipProvider } from '@comitium/ui/tooltip';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal()),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const capacityReachedJob: CareerJob = {
  id: 'job-1',
  postingId: '11111111-1111-4111-8111-111111111111',
  postingSlug: 'backend-engineer',
  canonicalUrl: 'https://jobs.example.test/backend-engineer',
  applicationCapacityAvailable: false,
  title: 'Backend Engineer',
  description: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Build reliable systems.' }] }],
  },
  socialDescription: null,
  status: 'open',
  responseDeadlineDays: null,
  createdAt: '2026-09-21T10:00:00.000Z',
  location: null,
  locationType: null,
  employmentType: null,
  category: null,
  compensation: null,
  companyInfo: null,
  departmentId: null,
  departmentSlug: null,
  departmentName: null,
  departmentSortOrder: null,
  orgId: 'org-1',
  org: {
    id: 'org-1',
    careersSlug: 'comitium',
    name: 'Comitium',
    description: null,
    logo: null,
    website: null,
  },
  recruitingPrivacy: {
    controllerName: 'Comitium',
    privacyPolicyUrl: 'https://example.test/privacy',
    aiCriteriaEvaluation: {
      enabled: false,
      additionalNotice: null,
      additionalNoticeUrl: null,
    },
  },
};

describe('CareerJobDetailPage', () => {
  it('keeps the existing disabled Apply control and capacity tooltip', async () => {
    const screen = await render(
      <TooltipProvider>
        <CareerJobDetailPage job={capacityReachedJob} />
      </TooltipProvider>,
    );
    const applyButton = screen.getByLabelText('Apply unavailable: application limit reached');

    await expect.element(applyButton).toBeDisabled();
    await applyButton.hover();
    await expect.element(screen.getByText('This job has reached its application limit.')).toBeInTheDocument();
  });
});
