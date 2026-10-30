import { TooltipProvider } from '@comitium/ui/tooltip';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { type ActivityFeedRow, activityFeedResponseSchema } from '@/lib/schemas/emails';

import { TimelineEventRow } from './index';

const IMAGE_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

vi.mock('@/hooks/queries/use-member-avatar', () => ({
  useMemberAvatar: (avatarUrl?: string | null) => (avatarUrl ? IMAGE_SRC : null),
}));

const event: ActivityFeedRow = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'stage_changed',
  createdAt: '2026-09-06T10:00:00.000Z',
  scope: 'application',
  applicationId: '22222222-2222-4222-8222-222222222222',
  jobId: '33333333-3333-4333-8333-333333333333',
  jobTitle: 'Product Engineer',
  actor: {
    userId: '44444444-4444-4444-8444-444444444444',
    name: 'Ada Lovelace',
    avatarUrl: '/orgs/org/members/user/avatar/version',
  },
  actorRole: 'org_member',
  metadata: {},
  payload: {
    kind: 'stage',
    transitionId: '55555555-5555-4555-8555-555555555555',
    fromStageId: null,
    fromStageName: null,
    fromStageType: null,
    toStageId: '66666666-6666-4666-8666-666666666666',
    toStageName: 'Screening',
    toStageType: 'active',
    durationSeconds: null,
    archiveReason: null,
  },
};

describe('TimelineEventRow', () => {
  it('loads a mixed feed with custom field updates, clears and stage changes', async () => {
    const response = activityFeedResponseSchema.parse({
      data: [
        ...['custom_field_value_set', 'custom_field_value_cleared'].map((type) => ({
          ...event,
          id: type,
          type,
          scope: 'candidate',
          applicationId: null,
          jobId: null,
          jobTitle: null,
          payload: { kind: 'generic' },
        })),
        event,
      ],
      pagination: { nextCursor: null, hasMore: false },
    });

    const screen = await render(
      <TooltipProvider>
        {response.data.map((row) => (
          <TimelineEventRow
            key={row.id}
            event={row}
            selectedApplicationId={event.applicationId}
            timeZone="Europe/Warsaw"
          />
        ))}
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Custom field updated', { exact: true })).toBeVisible();
    await expect.element(screen.getByText('Custom field cleared', { exact: true })).toBeVisible();
    await expect.element(screen.getByText('Moved to Screening', { exact: true })).toBeVisible();
  });

  it('renders the authenticated avatar included in the activity actor identity', async () => {
    const screen = await render(
      <TooltipProvider>
        <TimelineEventRow event={event} selectedApplicationId={event.applicationId} timeZone="Europe/Warsaw" />
      </TooltipProvider>,
    );

    await expect.element(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', IMAGE_SRC);
  });

  it('labels a public application as submitted without a team-member fallback', async () => {
    const applicantEvent: ActivityFeedRow = {
      ...event,
      type: 'application_created',
      actorRole: 'applicant',
      actor: {
        userId: '77777777-7777-4777-8777-777777777777',
        name: null,
        avatarUrl: null,
      },
      payload: { kind: 'generic' },
    };

    const screen = await render(
      <TooltipProvider>
        <TimelineEventRow
          event={applicantEvent}
          selectedApplicationId={applicantEvent.applicationId}
          timeZone="Europe/Warsaw"
        />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Application submitted', { exact: true })).toBeVisible();
    expect(screen.getByText(/Team member/).query()).toBeNull();
  });

  it('keeps creation attribution for a recruiter-created application', async () => {
    const recruiterEvent: ActivityFeedRow = {
      ...event,
      type: 'application_created',
      payload: { kind: 'generic' },
    };

    const screen = await render(
      <TooltipProvider>
        <TimelineEventRow
          event={recruiterEvent}
          selectedApplicationId={recruiterEvent.applicationId}
          timeZone="Europe/Warsaw"
        />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Application created', { exact: true })).toBeVisible();
    await expect.element(screen.getByText('by Ada Lovelace', { exact: true })).toBeVisible();
  });

  it('renders a readable candidate profile update label', async () => {
    const profileEvent: ActivityFeedRow = {
      ...event,
      type: 'candidate_profile_updated',
      payload: { kind: 'generic' },
    };

    const screen = await render(
      <TooltipProvider>
        <TimelineEventRow
          event={profileEvent}
          selectedApplicationId={profileEvent.applicationId}
          timeZone="Europe/Warsaw"
        />
      </TooltipProvider>,
    );

    await expect.element(screen.getByText('Candidate profile updated', { exact: true })).toBeVisible();
  });
});
