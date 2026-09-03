import { describe, expect, it } from 'vitest';

import { bookPublicScheduleResponseSchema, publicScheduleStatusSchema } from '../public-schedule';

describe('public scheduling contracts', () => {
  it('does not expose an internal booking reservation status', () => {
    expect(publicScheduleStatusSchema.safeParse('confirming').success).toBe(false);
  });

  it('accepts only completed bookings from the booking endpoint', () => {
    const response = {
      data: {
        scheduleId: '00000000-0000-4000-8000-000000000001',
        eventId: '00000000-0000-4000-8000-000000000002',
        status: 'confirming',
        scheduledAt: '2099-08-03T10:00:00.000Z',
        meetingUrl: null,
      },
    };

    expect(bookPublicScheduleResponseSchema.safeParse(response).success).toBe(false);
  });
});
