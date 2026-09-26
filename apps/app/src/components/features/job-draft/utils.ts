import type { TipTapDoc } from '@comitium/schemas/common';
import type { EvaluationCriterion } from '@comitium/schemas/jobs';
import { richTextToPlainText } from '@comitium/ui/rich-text';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
import { isDefined } from '@/lib/utils';
import { isValidApplicationCapacity } from '../job-posting/application-capacity';
import type { PublishValidationError } from '../job-posting/publish-validation-banner';
import { DRAFT_SECTIONS, type DraftTab } from './sections';

export type PublishError = PublishValidationError<DraftTab>;

export type StepStatus = 'incomplete' | 'error';

export function isDraftEditorPath(pathname: string, orgId: string, jobId: string): boolean {
  const basePath = `/org/${orgId}/jobs/${jobId}`;

  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

interface PublishValidationInput {
  values: JobSettingsFormData;
  description: TipTapDoc | null;
  formId: string | null;
  formIsArchived: boolean;
  criteria: EvaluationCriterion[];
  interviewPlanId: string | null;
}

export function validateForPublish({
  values,
  description,
  formId,
  formIsArchived,
  criteria,
  interviewPlanId,
}: PublishValidationInput): PublishError[] {
  const errors: PublishError[] = [];

  if (!values.title.trim()) {
    errors.push({ label: 'Title', target: 'settings' });
  }

  if (!values.category) {
    errors.push({ label: 'Category', target: 'settings' });
  }

  if (!values.departmentId) {
    errors.push({ label: 'Department', target: 'settings' });
  }

  if (!values.locationId || !values.locationType) {
    errors.push({ label: 'Location', target: 'settings' });
  }

  if (!values.employmentType) {
    errors.push({ label: 'Employment type', target: 'settings' });
  }

  if (!values.compensationCurrency) {
    errors.push({ label: 'Currency', target: 'settings' });
  }

  if (!values.compensationPeriod) {
    errors.push({ label: 'Pay period', target: 'settings' });
  }

  const hasMin = values.compensationMin != null && values.compensationMin > 0;
  const hasMax = values.compensationMax != null && values.compensationMax > 0;

  if (!hasMin || !hasMax) {
    errors.push({ label: 'Compensation', target: 'settings' });
  } else if (
    isDefined(values.compensationMin) &&
    isDefined(values.compensationMax) &&
    values.compensationMin > values.compensationMax
  ) {
    errors.push({ label: 'Compensation (min must be less than max)', target: 'settings' });
  }

  if (!richTextToPlainText(description)) {
    errors.push({ label: 'Description', target: 'posting' });
  }

  if (!formId || formIsArchived) {
    errors.push({ label: 'Application form', target: 'posting' });
  }

  if (!isValidApplicationCapacity(values.applicationCapacity ?? null)) {
    errors.push({ label: 'Application capacity', target: 'posting' });
  }

  if (!interviewPlanId) {
    errors.push({ label: 'Interview plan', target: 'interview-plan' });
  }

  const hasIncompleteCriteria = criteria.some((c) => !c.title.trim() || !c.prompt.trim());

  if (hasIncompleteCriteria) {
    errors.push({ label: 'Evaluation criteria', target: 'criteria' });
  }

  return errors;
}

export function getStepStatuses(publishErrors: PublishError[]): StepStatus[] {
  const hasError = (tab: DraftTab) => publishErrors.some((error) => error.target === tab);

  return DRAFT_SECTIONS.map((section) => (hasError(section.id) ? 'error' : 'incomplete'));
}
