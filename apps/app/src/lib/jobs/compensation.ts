import { DEFAULT_COMPENSATION_CURRENCY, DEFAULT_COMPENSATION_PERIOD } from '@comitium/schemas/job-enums';
import { NON_DIGIT_REGEX, THOUSANDS_SEPARATOR_POSITION_REGEX } from '@comitium/schemas/patterns';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';

type CompensationFormValues = Pick<
  JobSettingsFormData,
  'compensationCurrency' | 'compensationPeriod' | 'compensationMin' | 'compensationMax'
>;

export function buildCompensation(values: CompensationFormValues) {
  if (values.compensationMin == null && values.compensationMax == null) {
    return null;
  }

  return {
    tiers: [
      {
        currency: values.compensationCurrency ?? DEFAULT_COMPENSATION_CURRENCY,
        period: values.compensationPeriod ?? DEFAULT_COMPENSATION_PERIOD,
        base_min: values.compensationMin ?? undefined,
        base_max: values.compensationMax ?? undefined,
      },
    ],
  };
}

export function parseCompensationAmountInput(value: string): number | undefined {
  const digits = value.replace(NON_DIGIT_REGEX, '');

  return digits ? Number.parseInt(digits, 10) : undefined;
}

export function formatCompensationAmountInput(value?: number): string {
  if (value === undefined) {
    return '';
  }

  return String(value).replace(THOUSANDS_SEPARATOR_POSITION_REGEX, ',');
}
