import type { CareerJob } from '@comitium/jobs/schemas';
import type { EmploymentType } from '@comitium/schemas/job-enums';
import type { CompensationConfig, CompensationTier, LocationEntry } from '@comitium/schemas/public-jobs';

import { getWebUrl } from './json-ld';
import { absolutePublicUrl } from './public';

const JOB_POSTING_EMPLOYMENT_TYPE = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  internship: 'INTERN',
} satisfies Record<EmploymentType, string>;

const JOB_POSTING_SALARY_UNIT: Record<string, string> = {
  year: 'YEAR',
  month: 'MONTH',
  hour: 'HOUR',
};

function getEmploymentType(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  if (!(value in JOB_POSTING_EMPLOYMENT_TYPE)) {
    return undefined;
  }

  return JOB_POSTING_EMPLOYMENT_TYPE[value as EmploymentType];
}

function buildJobLocation(location: LocationEntry) {
  return {
    '@type': 'Place',
    address: {
      '@type': 'PostalAddress',
      addressLocality: location.name,
    },
  };
}

function buildApplicantLocationRequirement(location: LocationEntry) {
  return {
    '@type': 'AdministrativeArea',
    name: location.name,
  };
}

function buildHiringOrganization(job: CareerJob, companyName: string) {
  const sameAs = getWebUrl(job.org.website);
  const logo = getWebUrl(job.org.logo);

  return {
    '@type': 'Organization',
    name: companyName,
    ...(sameAs ? { sameAs } : {}),
    ...(logo ? { logo } : {}),
  };
}

function buildLocationProperties(job: CareerJob) {
  const locations = job.location ?? [];

  if (job.locationType === 'remote') {
    if (locations.length === 0) {
      return {
        jobLocationType: 'TELECOMMUTE',
      };
    }

    return {
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: locations.map(buildApplicantLocationRequirement),
    };
  }

  if (locations.length === 0) {
    return {};
  }

  return {
    jobLocation: locations.map(buildJobLocation),
  };
}

function getPrimaryCompensationTier(compensation: CompensationConfig | null): CompensationTier | null {
  return compensation?.tiers[0] ?? null;
}

function salaryUnitText(period: string): string | null {
  return JOB_POSTING_SALARY_UNIT[period] ?? null;
}

function buildSalaryValue(tier: CompensationTier, unitText: string) {
  const minValue = tier.base_min ?? null;
  const maxValue = tier.base_max ?? null;

  if (minValue == null && maxValue == null) {
    return null;
  }

  if (minValue != null && maxValue != null && minValue === maxValue) {
    return {
      '@type': 'QuantitativeValue',
      value: minValue,
      unitText,
    };
  }

  return {
    '@type': 'QuantitativeValue',
    ...(minValue != null ? { minValue } : {}),
    ...(maxValue != null ? { maxValue } : {}),
    unitText,
  };
}

function buildBaseSalary(compensation: CompensationConfig | null) {
  const tier = getPrimaryCompensationTier(compensation);

  if (!tier) {
    return undefined;
  }

  const unitText = salaryUnitText(tier.period);

  if (!unitText) {
    return undefined;
  }

  const value = buildSalaryValue(tier, unitText);

  if (!value) {
    return undefined;
  }

  return {
    '@type': 'MonetaryAmount',
    currency: tier.currency,
    value,
  };
}

export function buildJobPostingJsonLd(job: CareerJob) {
  const companyName = job.org.name ?? job.companyInfo?.name ?? 'Organization';
  const baseSalary = buildBaseSalary(job.compensation);

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    identifier: {
      '@type': 'PropertyValue',
      name: companyName,
      value: job.postingId,
    },
    title: job.title ?? 'Untitled Position',
    description: job.description ?? '',
    datePosted: job.createdAt,
    employmentType: getEmploymentType(job.employmentType),
    url: absolutePublicUrl(job.canonicalUrl),
    hiringOrganization: buildHiringOrganization(job, companyName),
    ...buildLocationProperties(job),
    ...(baseSalary ? { baseSalary } : {}),
  };
}
