import { describe, expect, it } from 'vitest';

import { jobListItemSchema } from '../public-jobs';

describe('jobListItemSchema', () => {
  it('accepts the public list projection without recruiter lifecycle state', () => {
    const result = jobListItemSchema.safeParse({
      id: 'job-id',
      postingId: '00000000-0000-4000-8000-000000000001',
      postingSlug: 'protocol-engineer',
      orgSlug: 'acme',
      canonicalUrl: '/careers/acme/jobs/protocol-engineer',
      jobCommitmentId: null,
      applyMode: 'standard',
      applicationCapacityAvailable: true,
      chainId: null,
      commitmentContract: null,
      jobId: null,
      commitmentStatus: null,
      title: 'Protocol Engineer',
      description: null,
      socialDescription: null,
      status: 'open',
      creatorAddress: null,
      responseDeadlineDays: null,
      txHash: null,
      createdAt: '2026-07-13T12:00:00.000Z',
      location: null,
      locationType: null,
      employmentType: null,
      category: null,
      compensation: null,
      companyInfo: null,
      totalApplications: 0,
    });

    expect(result.success).toBe(true);
  });
});
