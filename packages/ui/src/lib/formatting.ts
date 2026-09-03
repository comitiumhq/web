import type { LocationEntry } from '@comitium/schemas/public-jobs';

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdRawFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdWholeFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  on_site: 'On-site',
};

export function formatUsd(value: number): string {
  return usdFormatter.format(value);
}

export function formatUsdRaw(value: number): string {
  return usdRawFormatter.format(value);
}

export function formatUsdWhole(value: number): string {
  return usdWholeFormatter.format(value);
}

export function formatEmploymentType(type: string): string {
  return EMPLOYMENT_TYPE_LABELS[type] ?? type;
}

export function formatLocationType(locationType?: string | null): string | null {
  return locationType ? (LOCATION_TYPE_LABELS[locationType] ?? locationType) : null;
}

export function formatLocation(location?: LocationEntry[] | null): string | null {
  return location?.length ? location.map((entry) => entry.name).join(', ') : null;
}
