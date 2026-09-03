import type { CareerJob } from '@comitium/jobs/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildJobPostingJsonLd } from '../job-posting-json-ld';

const baseJob: CareerJob = {
  id: 'job-uuid',
  postingId: 'posting-uuid',
  postingSlug: 'senior-engineer',
  canonicalUrl: '/careers/acme/jobs/senior-engineer',
  jobCommitmentId: 'commitment-uuid',
  applyMode: 'committed',
  applicationCapacityAvailable: true,
  commitmentStatus: 'published',
  chainId: 8453,
  commitmentContract: '0x0000000000000000000000000000000000000000',
  jobId: 42,
  title: 'Senior Engineer',
  socialDescription: 'Build useful systems at Acme.',
  status: 'open',
  txHash: `0x${'1'.repeat(64)}`,
  createdAt: '2026-06-08T10:00:00.000Z',
  location: [{ name: 'Berlin', cityId: 2950159 }],
  locationType: 'remote',
  employmentType: 'contract',
  departmentId: '11111111-1111-4111-8111-111111111111',
  departmentSlug: 'engineering',
  departmentName: 'Engineering',
  departmentSortOrder: 0,
  compensation: null,
  companyInfo: null,
  orgId: 'org-uuid',
  creatorAddress: '0x1111111111111111111111111111111111111111',
  orgOnChainId: 7,
  org: {
    id: 'org-uuid',
    onChainOrgId: 7,
    careersSlug: 'acme',
    txHash: `0x${'2'.repeat(64)}`,
    name: 'Acme',
    description: null,
    logo: 'ipfs://bafybeigdyrzt',
    website: 'https://acme.example',
  },
  description: '<p>Build useful things.</p>',
  responseDeadlineDays: 5,
  category: 'engineering',
  recruitingPrivacy: {
    controllerName: 'Acme',
    privacyPolicyUrl: 'https://acme.example/privacy',
    aiCriteriaEvaluation: {
      enabled: true,
      additionalNotice: null,
      additionalNoticeUrl: null,
    },
  },
};

describe('buildJobPostingJsonLd', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_ENVIRONMENT', 'production');
    vi.stubEnv('VITE_PUBLIC_SITE_ORIGIN', 'https://comitium.co');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('maps Comitium fields to Google JobPosting structured data', () => {
    expect(buildJobPostingJsonLd(baseJob)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Senior Engineer',
      description: '<p>Build useful things.</p>',
      employmentType: 'CONTRACTOR',
      url: 'https://comitium.co/careers/acme/jobs/senior-engineer',
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: [{ '@type': 'AdministrativeArea', name: 'Berlin' }],
      hiringOrganization: {
        '@type': 'Organization',
        name: 'Acme',
        sameAs: 'https://acme.example',
      },
    });
    expect(buildJobPostingJsonLd(baseJob).hiringOrganization).not.toHaveProperty('logo');
  });

  it('uses physical jobLocation for non-remote jobs', () => {
    const jsonLd = buildJobPostingJsonLd({ ...baseJob, locationType: 'on_site', employmentType: 'full_time' });

    expect(jsonLd).toMatchObject({
      employmentType: 'FULL_TIME',
      jobLocation: [
        {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Berlin',
          },
        },
      ],
    });
    expect(jsonLd).not.toHaveProperty('jobLocationType');
  });

  it('keeps crawlable hiring organization logos', () => {
    const jsonLd = buildJobPostingJsonLd({
      ...baseJob,
      org: { ...baseJob.org, logo: 'https://cdn.example/logo.png' },
    });

    expect(jsonLd.hiringOrganization).toMatchObject({
      logo: 'https://cdn.example/logo.png',
    });
  });

  it('adds baseSalary when compensation has a supported period and range', () => {
    const jsonLd = buildJobPostingJsonLd({
      ...baseJob,
      compensation: {
        tiers: [{ currency: 'USD', period: 'year', base_min: 120000, base_max: 180000 }],
      },
    });

    expect(jsonLd).toMatchObject({
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'USD',
        value: {
          '@type': 'QuantitativeValue',
          minValue: 120000,
          maxValue: 180000,
          unitText: 'YEAR',
        },
      },
    });
  });

  it('omits baseSalary when compensation cannot be expressed honestly', () => {
    const unsupportedPeriod = buildJobPostingJsonLd({
      ...baseJob,
      compensation: {
        tiers: [{ currency: 'USD', period: 'equity' }],
      },
    });
    const emptyRange = buildJobPostingJsonLd({
      ...baseJob,
      compensation: {
        tiers: [{ currency: 'USD', period: 'year' }],
      },
    });

    expect(unsupportedPeriod).not.toHaveProperty('baseSalary');
    expect(emptyRange).not.toHaveProperty('baseSalary');
  });
});
