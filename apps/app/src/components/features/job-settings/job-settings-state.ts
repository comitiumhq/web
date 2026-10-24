import { DEFAULT_COMPENSATION_CURRENCY, DEFAULT_COMPENSATION_PERIOD } from '@comitium/schemas/job-enums';
import type { JobEditor, UpdateJobEditorData } from '@comitium/schemas/jobs';
import { buildCompensation } from '@/lib/jobs/compensation';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';

export function jobToSettingsFormValues(job: JobEditor): JobSettingsFormData {
  return {
    title: job.title,
    departmentId: job.departmentId ?? undefined,
    locationId: job.locationId ?? undefined,
    location: job.location ?? undefined,
    locationType: (job.locationType as JobSettingsFormData['locationType']) ?? undefined,
    employmentType: (job.employmentType as JobSettingsFormData['employmentType']) ?? undefined,
    category: (job.category as JobSettingsFormData['category']) ?? undefined,
    compensationCurrency:
      (job.compensation?.tiers[0]?.currency as JobSettingsFormData['compensationCurrency']) ??
      DEFAULT_COMPENSATION_CURRENCY,
    compensationPeriod:
      (job.compensation?.tiers[0]?.period as JobSettingsFormData['compensationPeriod']) ?? DEFAULT_COMPENSATION_PERIOD,
    compensationMin: job.compensation?.tiers[0]?.base_min ?? undefined,
    compensationMax: job.compensation?.tiers[0]?.base_max ?? undefined,
    compensationDisplayMode: job.compensationDisplayMode,
    applicationCapacity: job.applicationCapacity,
  };
}

export function prepareJobSettingsUpdate(values: JobSettingsFormData): Omit<UpdateJobEditorData, 'expectedVersion'> {
  const departmentUpdate = values.departmentId ? { departmentId: values.departmentId } : {};
  const locationUpdate = values.locationId ? { locationId: values.locationId } : {};

  return {
    title: values.title.trim(),
    ...departmentUpdate,
    ...locationUpdate,
    employmentType: values.employmentType ?? null,
    category: values.category ?? null,
    compensation: buildCompensation(values),
    compensationDisplayMode: values.compensationDisplayMode ?? 'inherit',
  };
}
