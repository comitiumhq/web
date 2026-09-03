export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]['value'];

export const EMPLOYMENT_TYPE_VALUES = EMPLOYMENT_TYPES.map((t) => t.value) as [EmploymentType, ...EmploymentType[]];

export const LOCATION_TYPES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on_site', label: 'On-site' },
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number]['value'];

export const LOCATION_TYPE_VALUES = LOCATION_TYPES.map((m) => m.value) as [LocationType, ...LocationType[]];

export const CATEGORIES = [
  { value: 'product', label: 'Product' },
  { value: 'design', label: 'Design' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'data', label: 'Data & Analytics' },
  { value: 'devops', label: 'DevOps & Infrastructure' },
  { value: 'security', label: 'Security' },
  { value: 'qa', label: 'QA & Testing' },
  { value: 'it', label: 'IT & Tech Support' },
  { value: 'research', label: 'Research & Science' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales & BD' },
  { value: 'customer-success', label: 'Customer Success' },
  { value: 'support', label: 'Customer Support' },
  { value: 'operations', label: 'Operations' },
  { value: 'project-management', label: 'Project Management' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'finance', label: 'Finance & Accounting' },
  { value: 'hr', label: 'HR & People' },
  { value: 'legal', label: 'Legal & Compliance' },
  { value: 'community', label: 'Community & DevRel' },
  { value: 'other', label: 'Other' },
] as const;

export type Category = (typeof CATEGORIES)[number]['value'];

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];

export const PUBLIC_JOB_SORTS = [
  { value: 'stake_desc', label: 'Stake' },
  { value: 'newest', label: 'Newest' },
] as const;

export type PublicJobSort = (typeof PUBLIC_JOB_SORTS)[number]['value'];

export const PUBLIC_JOB_SORT_VALUES = PUBLIC_JOB_SORTS.map((sort) => sort.value) as [PublicJobSort, ...PublicJobSort[]];

export const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CHF', label: 'CHF (Fr)', symbol: 'Fr' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { value: 'CNY', label: 'CNY (¥)', symbol: '¥' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  { value: 'BRL', label: 'BRL (R$)', symbol: 'R$' },
  { value: 'MXN', label: 'MXN ($)', symbol: '$' },
  { value: 'SEK', label: 'SEK (kr)', symbol: 'kr' },
  { value: 'NOK', label: 'NOK (kr)', symbol: 'kr' },
  { value: 'DKK', label: 'DKK (kr)', symbol: 'kr' },
  { value: 'PLN', label: 'PLN (zł)', symbol: 'zł' },
  { value: 'CZK', label: 'CZK (Kč)', symbol: 'Kč' },
  { value: 'SGD', label: 'SGD (S$)', symbol: 'S$' },
  { value: 'HKD', label: 'HKD (HK$)', symbol: 'HK$' },
  { value: 'KRW', label: 'KRW (₩)', symbol: '₩' },
  { value: 'NZD', label: 'NZD (NZ$)', symbol: 'NZ$' },
  { value: 'ILS', label: 'ILS (₪)', symbol: '₪' },
  { value: 'AED', label: 'AED (د.إ)', symbol: 'د.إ' },
  { value: 'ZAR', label: 'ZAR (R)', symbol: 'R' },
  { value: 'THB', label: 'THB (฿)', symbol: '฿' },
  { value: 'TWD', label: 'TWD (NT$)', symbol: 'NT$' },
] as const;

export const COMPENSATION_CURRENCIES = CURRENCIES.filter(
  (currency) => currency.value === 'USD' || currency.value === 'EUR',
);

export type Currency = (typeof CURRENCIES)[number]['value'];

export const CURRENCY_VALUES = CURRENCIES.map((c) => c.value) as [Currency, ...Currency[]];

export const SALARY_PERIODS = [
  { value: 'year', label: 'Year' },
  { value: 'month', label: 'Month' },
  { value: 'hour', label: 'Hour' },
] as const;

export type SalaryPeriod = (typeof SALARY_PERIODS)[number]['value'];

export const SALARY_PERIOD_VALUES = SALARY_PERIODS.map((p) => p.value) as [SalaryPeriod, ...SalaryPeriod[]];

export const DEFAULT_COMPENSATION_CURRENCY: Currency = 'USD';
export const DEFAULT_COMPENSATION_PERIOD: SalaryPeriod = 'year';

export function getLabel<T extends { value: string; label: string }>(options: readonly T[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
