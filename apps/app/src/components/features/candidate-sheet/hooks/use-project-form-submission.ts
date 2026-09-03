import type { WrappedKey } from '@comitium/schemas/common';
import type { VaultKeyResponse } from '@comitium/schemas/vault';
import { logger } from '@comitium/ui/logger';
import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { useProjectCandidateCustomFieldValue } from '@/hooks/mutations/use-project-candidate-custom-field-value';
import { candidateFormConnectorsQueryOptions } from '@/hooks/queries/candidate-form-connectors-query-options';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import { collectProjections, type ProjectionOp } from '@/lib/forms/connectors/project';
import { encodeCandidateCustomFieldValue } from '@/lib/forms/custom-field-value-codec';
import type { ProjectCandidateCustomFieldValueBody } from '@/lib/schemas/candidate-custom-field-values';
import type { ConnectorRow } from '@/lib/schemas/form-field-connectors';

interface UseProjectFormSubmissionParams {
  orgId: string;
  candidateId: string | null;
  formId: string | null;
  submissionId: string | null;
  decryptedAnswers: Record<string, unknown> | null;
  enabled: boolean;
}

export function useProjectFormSubmission({
  orgId,
  candidateId,
  formId,
  submissionId,
  decryptedAnswers,
  enabled,
}: UseProjectFormSubmissionParams) {
  const submissions = useMemo<ProjectableFormSubmission[]>(
    () => (formId && submissionId && decryptedAnswers ? [{ id: submissionId, formId, answers: decryptedAnswers }] : []),
    [decryptedAnswers, formId, submissionId],
  );

  useProjectFormSubmissions({ orgId, candidateId, submissions, enabled });
}

export interface ProjectableFormSubmission {
  id: string;
  formId: string;
  answers: Record<string, unknown>;
}

function selectConnectorPlans(results: Array<{ data?: { data: ConnectorRow[] } }>) {
  return results.map((result) => result.data?.data);
}

interface UseProjectFormSubmissionsParams {
  orgId: string;
  candidateId: string | null;
  submissions: ProjectableFormSubmission[];
  enabled: boolean;
}

export function useProjectFormSubmissions({
  orgId,
  candidateId,
  submissions,
  enabled,
}: UseProjectFormSubmissionsParams) {
  const { data: vaultKey } = useQueryOrgVaultKey(orgId);
  const { data: wrappedVaultKey } = useQueryWrappedVaultKey(orgId);
  const { mutateAsync: projectValue } = useProjectCandidateCustomFieldValue();
  const formIds = useMemo(() => [...new Set(submissions.map((submission) => submission.formId))].sort(), [submissions]);
  const connectorPlans = useQueries({
    queries: formIds.map((formId) => candidateFormConnectorsQueryOptions(candidateId, formId, enabled)),
    combine: selectConnectorPlans,
  });
  const connectorsByFormId = useMemo(
    () => new Map(formIds.map((formId, index) => [formId, connectorPlans[index]] as const)),
    [connectorPlans, formIds],
  );

  const attemptedProjectionKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    attemptedProjectionKeysRef.current = new Set();
  }, [candidateId]);

  useEffect(() => {
    if (!enabled || !candidateId || !vaultKey || !wrappedVaultKey) {
      return;
    }

    const projectionCandidateId = candidateId;
    const projectionVaultKey = vaultKey;
    const projectionWrappedVaultKey = wrappedVaultKey;
    let cancelled = false;

    async function projectPendingSubmissions() {
      for (const submission of submissions) {
        const connectors = connectorsByFormId.get(submission.formId);

        if (!connectors) {
          continue;
        }

        const ops = collectProjections({ submission, connectors });

        for (const op of ops) {
          if (cancelled) {
            return;
          }

          const projectionKey = `${submission.id}:${op.connectorId}`;

          if (attemptedProjectionKeysRef.current.has(projectionKey)) {
            continue;
          }

          attemptedProjectionKeysRef.current.add(projectionKey);

          try {
            await projectSubmissionValue({
              orgId,
              candidateId: projectionCandidateId,
              submissionId: submission.id,
              op,
              vaultKey: projectionVaultKey,
              wrappedVaultKey: projectionWrappedVaultKey,
              projectValue,
            });
          } catch (error) {
            if (import.meta.env.DEV) {
              logger.warn(`Connector projection failed for connector ${op.connectorId}:`, error);
            }
          }
        }
      }
    }

    projectPendingSubmissions();

    return () => {
      cancelled = true;
    };
  }, [candidateId, connectorsByFormId, enabled, orgId, projectValue, submissions, vaultKey, wrappedVaultKey]);
}

interface ProjectSubmissionValueParams {
  orgId: string;
  candidateId: string;
  submissionId: string;
  op: ProjectionOp;
  vaultKey: VaultKeyResponse;
  wrappedVaultKey: WrappedKey;
  projectValue: (params: {
    candidateId: string;
    body: ProjectCandidateCustomFieldValueBody;
  }) => Promise<{ applied: boolean }>;
}

async function projectSubmissionValue({
  orgId,
  candidateId,
  submissionId,
  op,
  vaultKey,
  wrappedVaultKey,
  projectValue,
}: ProjectSubmissionValueParams) {
  const { encryptedValue, valueHash } = await encodeCandidateCustomFieldValue({
    orgId,
    candidateId,
    fieldId: op.fieldId,
    fieldType: op.fieldType,
    value: op.value,
    vaultPublicKey: vaultKey.vaultPublicKey,
    vaultKeyVersion: vaultKey.keyVersion,
    wrappedVaultKey,
  });

  await projectValue({
    candidateId,
    body: {
      connectorId: op.connectorId,
      submissionId,
      encryptedValue,
      valueHash,
    },
  });
}
