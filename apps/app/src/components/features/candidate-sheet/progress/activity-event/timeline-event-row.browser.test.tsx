import { TooltipProvider } from '@comitium/ui/tooltip';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ActivityFeedRow } from '@/lib/schemas/emails';

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
    externalWallet: null,
    name: 'Ada Lovelace',
    avatarUrl: '/orgs/org/members/user/avatar/version',
  },
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
  it('renders the authenticated avatar included in the activity actor identity', async () => {
    const screen = await render(
      <TooltipProvider>
        <TimelineEventRow event={event} selectedApplicationId={event.applicationId} timeZone="Europe/Warsaw" />
      </TooltipProvider>,
    );

    await expect.element(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', IMAGE_SRC);
  });
});
