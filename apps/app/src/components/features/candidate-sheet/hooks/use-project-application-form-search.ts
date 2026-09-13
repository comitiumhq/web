import type { WrappedKey } from '@comitium/schemas/common';
import { FORM_FIELD_PROJECTION_VERSION, type FormDefinitionSnapshot } from '@comitium/schemas/forms/form-submission';
import { logger } from '@comitium/ui/logger';
import { useEffect, useRef } from 'react';
import { projectApplicationFormSubmission } from '@/lib/api/form-submissions';
import { projectSubmissionFieldValues } from '@/lib/forms/submission-field-projections';
import { isDefined } from '@/lib/utils';

interface UseProjectApplicationFormSearchParams {
  applicationId: string | null;
  orgId: string;
  form: FormDefinitionSnapshot | null;
  answers: Record<string, unknown> | null;
  storedVersion: number | null;
  wrappedVaultKey: WrappedKey | undefined;
  enabled: boolean;
}

export function useProjectApplicationFormSearch({
  applicationId,
  orgId,
  form,
  answers,
  storedVersion,
  wrappedVaultKey,
  enabled,
}: UseProjectApplicationFormSearchParams) {
  const attemptedApplicationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (storedVersion === FORM_FIELD_PROJECTION_VERSION) {
      attemptedApplicationIdRef.current = applicationId;
      return;
    }

    const projectionInput = getApplicationFormProjectionInput(enabled, applicationId, form, answers, wrappedVaultKey);

    if (!isDefined(projectionInput)) {
      return;
    }

    if (attemptedApplicationIdRef.current === projectionInput.applicationId) {
      return;
    }

    const {
      applicationId: projectionApplicationId,
      form: projectionForm,
      answers: projectionAnswers,
      wrappedVaultKey: projectionVaultKey,
    } = projectionInput;

    attemptedApplicationIdRef.current = projectionApplicationId;

    projectSubmissionFieldValues(orgId, projectionVaultKey, projectionForm, projectionAnswers)
      .then((fieldValues) => projectApplicationFormSubmission(projectionApplicationId, fieldValues))
      .catch((error) => {
        if (import.meta.env.DEV) {
          logger.warn(`Application form search projection failed for application ${projectionApplicationId}:`, error);
        }
      });
  }, [answers, applicationId, enabled, form, orgId, storedVersion, wrappedVaultKey]);
}

interface ApplicationFormProjectionInput {
  applicationId: string;
  form: FormDefinitionSnapshot;
  answers: Record<string, unknown>;
  wrappedVaultKey: WrappedKey;
}

function getApplicationFormProjectionInput(
  enabled: boolean,
  applicationId: string | null,
  form: FormDefinitionSnapshot | null,
  answers: Record<string, unknown> | null,
  wrappedVaultKey: WrappedKey | undefined,
): ApplicationFormProjectionInput | null {
  if (!enabled) {
    return null;
  }

  if (!isDefined(applicationId)) {
    return null;
  }

  if (!isDefined(form)) {
    return null;
  }

  if (!isDefined(answers)) {
    return null;
  }

  if (!isDefined(wrappedVaultKey)) {
    return null;
  }

  return { applicationId, form, answers, wrappedVaultKey };
}
