import { isDefined } from '@comitium/schemas/guards';
import { CATEGORIES, EMPLOYMENT_TYPES, getLabel, LOCATION_TYPES } from '@comitium/schemas/job-enums';
import { formatUsdWhole } from '@comitium/ui/formatting';

import type { ActiveFilterBadge, JobBoardFilters } from './types';

function hasSalaryValue(value?: number): value is number {
  return isDefined(value);
}

function getSalaryFilterLabel(filters: JobBoardFilters): string | null {
  const { salaryMin, salaryMax } = filters;

  if (hasSalaryValue(salaryMin) && hasSalaryValue(salaryMax)) {
    return `Annual USD ${formatUsdWhole(salaryMin)} – ${formatUsdWhole(salaryMax)}`;
  }

  if (hasSalaryValue(salaryMin)) {
    return `Annual USD ${formatUsdWhole(salaryMin)}+`;
  }

  if (hasSalaryValue(salaryMax)) {
    return `Annual USD up to ${formatUsdWhole(salaryMax)}`;
  }

  return null;
}

export function getAdvancedFilterBadges(filters: JobBoardFilters): ActiveFilterBadge[] {
  const badges: ActiveFilterBadge[] = [];
  const salaryLabel = getSalaryFilterLabel(filters);

  if (filters.locationType) {
    badges.push({ label: getLabel(LOCATION_TYPES, filters.locationType), key: 'locationType' });
  }
  if (filters.employmentType) {
    badges.push({ label: getLabel(EMPLOYMENT_TYPES, filters.employmentType), key: 'employmentType' });
  }
  if (filters.category) {
    badges.push({ label: getLabel(CATEGORIES, filters.category), key: 'category' });
  }

  if (salaryLabel) {
    badges.push({ label: salaryLabel, key: 'salary' });
  }

  return badges;
}
