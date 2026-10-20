import type { VaultKeyAccess } from '@comitium/crypto';
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
  vaultAccess: VaultKeyAccess | undefined;
  enabled: boolean;
}

export function useProjectApplicationFormSearch({
  applicationId,
  orgId,
  form,
  answers,
  storedVersion,
  vaultAccess,
  enabled,
}: UseProjectApplicationFormSearchParams) {
  const attemptedApplicationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (storedVersion === FORM_FIELD_PROJECTION_VERSION) {
      attemptedApplicationIdRef.current = applicationId;

      return;
    }

    const projectionInput = getApplicationFormProjectionInput(enabled, applicationId, form, answers, vaultAccess);

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
      vaultAccess: projectionVaultAccess,
    } = projectionInput;

    attemptedApplicationIdRef.current = projectionApplicationId;

    projectSubmissionFieldValues(orgId, projectionVaultAccess, projectionForm, projectionAnswers)
      .then((fieldValues) => projectApplicationFormSubmission(projectionApplicationId, fieldValues))
      .catch((error) => {
        if (import.meta.env.DEV) {
          logger.warn(`Application form search projection failed for application ${projectionApplicationId}:`, error);
        }
      });
  }, [answers, applicationId, enabled, form, orgId, storedVersion, vaultAccess]);
}

interface ApplicationFormProjectionInput {
  applicationId: string;
  form: FormDefinitionSnapshot;
  answers: Record<string, unknown>;
  vaultAccess: VaultKeyAccess;
}

function getApplicationFormProjectionInput(
  enabled: boolean,
  applicationId: string | null,
  form: FormDefinitionSnapshot | null,
  answers: Record<string, unknown> | null,
  vaultAccess: VaultKeyAccess | undefined,
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

  if (!isDefined(vaultAccess)) {
    return null;
  }

  return { applicationId, form, answers, vaultAccess };
}
