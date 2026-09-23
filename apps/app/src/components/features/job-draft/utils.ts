import type { TipTapDoc } from '@comitium/schemas/common';
import type { EvaluationCriterion } from '@comitium/schemas/jobs';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
import { isDefined } from '@/lib/utils';
import { DRAFT_SECTIONS, type DraftTab } from './sections';

export type PublishError = { label: string; tab: DraftTab };

export type StepStatus = 'incomplete' | 'error';

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
  values: JobSettingsFormData,
  description: TipTapDoc | null,
  formId: string | null,
  criteria: EvaluationCriterion[],
): PublishError[] {
  const errors: PublishError[] = [];

  if (!values.category) {
    errors.push({ label: 'Category', tab: 'settings' });
  }

  if (!values.departmentId) {
    errors.push({ label: 'Department', tab: 'settings' });
  }

  if (!values.locationId) {
    errors.push({ label: 'Location', tab: 'settings' });
  }

  if (!values.employmentType) {
    errors.push({ label: 'Employment type', tab: 'settings' });
  }

  if (!values.compensationCurrency) {
    errors.push({ label: 'Currency', tab: 'settings' });
  }

  if (!values.compensationPeriod) {
    errors.push({ label: 'Pay period', tab: 'settings' });
  }

  const hasMin = values.compensationMin != null && values.compensationMin > 0;
  const hasMax = values.compensationMax != null && values.compensationMax > 0;

  if (!hasMin || !hasMax) {
    errors.push({ label: 'Compensation', tab: 'settings' });
  } else if (
    isDefined(values.compensationMin) &&
    isDefined(values.compensationMax) &&
    values.compensationMin > values.compensationMax
  ) {
    errors.push({ label: 'Compensation (min must be less than max)', tab: 'settings' });
  }

  if (!descriptionHasContent(description)) {
    errors.push({ label: 'Description', tab: 'posting' });
  }

  if (!formId) {
    errors.push({ label: 'Application form', tab: 'posting' });
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
