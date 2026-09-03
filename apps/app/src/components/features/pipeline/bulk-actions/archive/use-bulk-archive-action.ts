import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryArchiveReasonsList } from '@/hooks/queries/use-query-archive-reasons-list';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import type { BulkOperation } from '@/lib/schemas/bulk-operations';
import { canPrepareBulkEmail } from '../email/bulk-email-payloads';
import { useBulkEmailDraft } from '../email/use-bulk-email-draft';
import { useBulkOperation } from '../hooks/use-bulk-operation';
import { getPipelineBulkTargets, getReadyTargets } from '../model';
import { settleBulkOperation } from '../operation/settle-bulk-operation';
import type { PipelineBulkActionSheetProps } from '../types';
import {
  buildArchiveReasonOptions,
  getArchiveReasonPlaceholder,
  getArchiveTemplateUseCase,
  isArchiveSubmitDisabled,
} from './archive-action-model';
import { prepareArchiveEmailPayloads } from './archive-email-preparation';
import { invalidateArchiveQueries } from './archive-query-invalidation';

export function useBulkArchiveAction(props: PipelineBulkActionSheetProps) {
  const queryClient = useQueryClient();
  const [archiveReasonId, setArchiveReasonId] = useState<string | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const reasonsQuery = useQueryArchiveReasonsList(props.orgId);
  const vaultQuery = useQueryOrgVaultKey(props.orgId);
  const reasons = reasonsQuery.data?.data ?? [];

  const handleSettled = useCallback(
    (operation: BulkOperation) => {
      invalidateArchiveQueries(queryClient, operation);
      settleBulkOperation({
        operation,
        successMessage: 'Applications archived',
        onCompleted: props.onCompleted,
        onOpenChange: props.onOpenChange,
      });
    },
    [props.onCompleted, props.onOpenChange, queryClient],
  );

  const bulk = useBulkOperation({
    orgId: props.orgId,
    operationType: 'application.archive',
    targetIds: props.applicationIds,
    open: props.open,
    onSettled: handleSettled,
  });

  const targets = useMemo(
    () => getPipelineBulkTargets(bulk.operation, props.pipelineApplications, props.namesMap),
    [bulk.operation, props.namesMap, props.pipelineApplications],
  );

  const readyTargets = getReadyTargets(targets);
  const emailTargets = readyTargets.filter((target) => target.application?.requiresEmail);
  const unavailableEmailTargets = emailTargets.filter((target) => !canPrepareBulkEmail(target));
  const preparableEmailCount = emailTargets.length - unavailableEmailTargets.length;
  const executableCount = readyTargets.length - unavailableEmailTargets.length;
  const selectedReason = reasons.find((reason) => reason.id === archiveReasonId);
  const templateUseCase = getArchiveTemplateUseCase(selectedReason);

  const draft = useBulkEmailDraft({
    applicationId: emailTargets.find(canPrepareBulkEmail)?.item.selectedTargetId,
    orgId: props.orgId,
    open: props.open && emailTargets.length > 0,
    useCase: templateUseCase,
  });

  const reasonOptions = useMemo(() => buildArchiveReasonOptions(reasons), [reasons]);

  useEffect(() => {
    if (props.open) return;

    setArchiveReasonId(null);
    setPreparationError(null);
  }, [props.open]);

  const handleOpenChange = (open: boolean) => {
    if (!open) bulk.discardDraft();

    props.onOpenChange(open);
  };

  const submit = async () => {
    if (!archiveReasonId) return;

    const payloads = await prepareArchiveEmailPayloads({
      emailTargets,
      preparableEmailCount,
      draft,
      orgId: props.orgId,
      vaultKey: vaultQuery.data,
      onError: setPreparationError,
    });

    if (!payloads) return;

    setPreparationError(null);

    await bulk.commit(
      {
        archiveReasonId,
        excludedItemIds: unavailableEmailTargets.map((target) => target.item.id),
      },
      payloads,
    );
  };

  return {
    archiveReasonId,
    setArchiveReasonId,
    reasonOptions,
    reasonPlaceholder: getArchiveReasonPlaceholder(reasonsQuery),
    reasonsLoading: reasonsQuery.isLoading,
    reasonsError: reasonsQuery.isError,
    emailRequired: emailTargets.length > 0,
    unavailableEmailTargets,
    preparationError,
    vaultError: vaultQuery.isError,
    executableCount,
    draft,
    bulk,
    targets,
    submitDisabled: isArchiveSubmitDisabled({
      archiveReasonId,
      reasonsLoading: reasonsQuery.isLoading,
      reasonsError: reasonsQuery.isError,
      executableCount,
      preparableEmailCount,
      vaultLoading: vaultQuery.isLoading,
      vaultError: vaultQuery.isError,
      hasVaultKey: Boolean(vaultQuery.data),
    }),
    handleOpenChange,
    submit,
  };
}
