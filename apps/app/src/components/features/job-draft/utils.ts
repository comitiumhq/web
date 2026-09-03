import type { TipTapDoc } from '@comitium/schemas/common';
import { DEFAULT_COMPENSATION_CURRENCY, DEFAULT_COMPENSATION_PERIOD } from '@comitium/schemas/job-enums';
import type { EvaluationCriterion } from '@comitium/schemas/jobs';
import type { DraftFormData } from '@/lib/schemas/draft-form';
import { isDefined } from '@/lib/utils';
import { DRAFT_SECTIONS, type DraftTab } from './sections';

export type PublishError = { label: string; tab: DraftTab };

export type StepStatus = 'incomplete' | 'error';

type CompensationFormValues = Pick<
  DraftFormData,
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

export function prepareEvaluationCriteria(criteria: EvaluationCriterion[]): EvaluationCriterion[] {
  return criteria.filter((criterion) => criterion.title.trim() && criterion.prompt.trim());
}

export function isDraftEditorPath(pathname: string, orgId: string, jobId: string): boolean {
  const basePath = `/org/${orgId}/jobs/${jobId}`;

  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function descriptionHasContent(doc: TipTapDoc | null): boolean {
  if (!doc?.content) {
    return false;
  }

  return doc.content.some((node) => {
    if (node.type === 'heading') {
      return false;
    }

    if (node.type === 'text' && node.text?.trim()) {
      return true;
    }

    if (node.content) {
      return descriptionHasContent(node as TipTapDoc);
    }

    return false;
  });
}

export function validateForPublish(
  values: DraftFormData,
  description: TipTapDoc | null,
  formId: string | null,
  criteria: EvaluationCriterion[],
): PublishError[] {
  const errors: PublishError[] = [];

  if (!values.category) {
    errors.push({ label: 'Category', tab: 'details' });
  }

  if (!values.departmentId) {
    errors.push({ label: 'Department', tab: 'details' });
  }

  if (!values.locationId) {
    errors.push({ label: 'Location', tab: 'details' });
  }

  if (!values.employmentType) {
    errors.push({ label: 'Employment type', tab: 'details' });
  }

  if (!values.compensationCurrency) {
    errors.push({ label: 'Currency', tab: 'details' });
  }

  if (!values.compensationPeriod) {
    errors.push({ label: 'Pay period', tab: 'details' });
  }

  const hasMin = values.compensationMin != null && values.compensationMin > 0;
  const hasMax = values.compensationMax != null && values.compensationMax > 0;

  if (!hasMin || !hasMax) {
    errors.push({ label: 'Compensation', tab: 'details' });
  } else if (
    isDefined(values.compensationMin) &&
    isDefined(values.compensationMax) &&
    values.compensationMin > values.compensationMax
  ) {
    errors.push({ label: 'Compensation (min must be less than max)', tab: 'details' });
  }

  if (!descriptionHasContent(description)) {
    errors.push({ label: 'Description', tab: 'description' });
  }

  if (!formId) {
    errors.push({ label: 'Application form', tab: 'application-form' });
  }

  const hasIncompleteCriteria = criteria.some((c) => !c.title.trim() || !c.prompt.trim());

  if (hasIncompleteCriteria) {
    errors.push({ label: 'Evaluation criteria', tab: 'criteria' });
  }

  return errors;
}

export function getStepStatuses(publishErrors: PublishError[]): StepStatus[] {
  const hasError = (tab: DraftTab) => publishErrors.some((e) => e.tab === tab);

  return DRAFT_SECTIONS.map((section) => (hasError(section.id) ? 'error' : 'incomplete'));
}
