import { describe, expect, it } from 'vitest';

import { jobListItemSchema } from '../public-jobs';

describe('jobListItemSchema', () => {
  it('accepts a public Remote job without a city or recruiter lifecycle state', () => {
    const result = jobListItemSchema.safeParse({
      id: 'job-id',
      postingId: '00000000-0000-4000-8000-000000000001',
      postingSlug: 'protocol-engineer',
      orgSlug: 'acme',
      canonicalUrl: '/careers/acme/jobs/protocol-engineer',
      applicationCapacityAvailable: true,
      title: 'Protocol Engineer',
      skills: [],
      description: null,
      socialDescription: null,
      status: 'open',
      createdAt: '2026-07-13T12:00:00.000Z',
      location: [{ name: 'Remote — Europe', cityId: null }],
      locationType: 'remote',
      employmentType: null,
      category: null,
      compensation: null,
      companyInfo: null,
    });

    expect(result.success).toBe(true);
  });
});
