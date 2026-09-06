import { TooltipProvider } from '@comitium/ui/tooltip';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import type { ScheduleInterviewActivity } from '@/lib/schemas/stage-activities';

import { ActivityRow } from './activity-row';

const IMAGE_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({ handleRef: vi.fn(), isDragging: false, ref: vi.fn() }),
}));

vi.mock('@/hooks/mutations/use-stage-activity-mutations', () => ({
  useDeleteOwnerActivity: () => ({ isPending: false, mutate: vi.fn() }),
}));

vi.mock('@/hooks/queries/use-member-avatar', () => ({
  useMemberAvatar: (avatarUrl?: string | null) => (avatarUrl ? IMAGE_SRC : null),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';
const activity: ScheduleInterviewActivity = {
  id: '22222222-2222-4222-8222-222222222222',
  stageId: '33333333-3333-4333-8333-333333333333',
  activityType: 'schedule_interview',
  activityOrder: 0,
  interviewId: '44444444-4444-4444-8444-444444444444',
  interviewTitle: 'Hiring manager interview',
  durationMinutes: 45,
  defaultInterviewers: [{ userId: USER_ID, name: 'Ada Lovelace', email: null, isActive: true, role: 'lead' }],
  createdAt: '2026-09-06T10:00:00.000Z',
  updatedAt: '2026-09-06T10:00:00.000Z',
};

describe('ActivityRow', () => {
  it('uses the current team read model when rendering assigned member avatars', async () => {
    const screen = await render(
      <TooltipProvider>
        <ActivityRow
          activity={activity}
          owner={{ kind: 'job', jobId: '55555555-5555-4555-8555-555555555555' }}
          memberMap={
            new Map([
              [USER_ID, { name: 'Ada Lovelace', email: null, avatarUrl: '/orgs/org/members/user/avatar/version' }],
            ])
          }
          canManage={false}
          isReviewStage={false}
          index={0}
          onEdit={vi.fn()}
        />
      </TooltipProvider>,
    );

    await expect.element(screen.getByRole('img', { name: 'Ada Lovelace' })).toHaveAttribute('src', IMAGE_SRC);
  });
});
