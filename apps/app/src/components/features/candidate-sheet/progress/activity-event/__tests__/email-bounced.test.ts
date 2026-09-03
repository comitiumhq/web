import { describe, expect, it } from 'vitest';

import { activityFeedRowSchema } from '@/lib/schemas/emails';

import { getEventLabel } from '../event-labels';
import { getEventSubline } from '../event-subline';

describe('email_bounced timeline event', () => {
  it('parses and formats delivery failure metadata', () => {
    const event = activityFeedRowSchema.parse({
      id: '2e029f0f-c5d0-4e5d-9e2d-5f2ac731c007',
      type: 'email_bounced',
      createdAt: '2026-06-19T10:00:00.000Z',
      scope: 'application',
      applicationId: '8eb3e02c-9c5f-4d4f-8c85-847f77fc4e83',
      jobId: 'df0a996c-2fd5-4d0e-b720-e6584e396ab9',
      jobTitle: 'Product Designer',
      actor: {
        userId: null,
        externalWallet: null,
        name: null,
      },
      metadata: {
        recipientEmail: 'candidate@example.com',
        reason: 'hard_bounce',
      },
      payload: {
        kind: 'generic',
      },
    });

    const currentApplicationSubline = getEventSubline(event, event.applicationId);
    const relatedApplicationSubline = getEventSubline(event, '96afb4c4-25e6-4b95-af77-b39ecedcf6fe');

    expect(getEventLabel(event)).toBe('Email bounced');
    expect(currentApplicationSubline).toContain('candidate@example.com');
    expect(currentApplicationSubline).toContain('hard_bounce');
    expect(currentApplicationSubline).not.toContain('Product Designer');
    expect(relatedApplicationSubline).toContain('Product Designer');
  });
});
