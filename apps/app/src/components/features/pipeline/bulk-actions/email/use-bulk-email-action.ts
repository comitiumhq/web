import { getProductErrorMessage } from '@comitium/ui/product-error-messages';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import { qk } from '@/hooks/query-keys';
import type { BulkOperation } from '@/lib/schemas/bulk-operations';
import { useBulkOperation } from '../hooks/use-bulk-operation';
import { getPipelineBulkTargets, getReadyTargets } from '../model';
import { settleBulkOperation } from '../operation/settle-bulk-operation';
import type { PipelineBulkActionSheetProps } from '../types';
import { canPrepareBulkEmail, prepareBulkEmailPayloads } from './bulk-email-payloads';
import { useBulkEmailDraft } from './use-bulk-email-draft';

export function useBulkEmailAction(props: PipelineBulkActionSheetProps) {
  const queryClient = useQueryClient();
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const vaultQuery = useQueryOrgVaultKey(props.orgId);

  const handleSettled = useCallback(
    (operation: BulkOperation) => {
      invalidateEmailSurfaces(queryClient, operation);
      settleBulkOperation({
        operation,
        successMessage: 'Emails sent',
        onCompleted: props.onCompleted,
        onOpenChange: props.onOpenChange,
      });
    },
    [props.onCompleted, props.onOpenChange, queryClient],
  );

  const bulk = useBulkOperation({
    orgId: props.orgId,
    operationType: 'application.email',
    targetIds: props.applicationIds,
    open: props.open,
    onSettled: handleSettled,
  });

  const targets = useMemo(
    () => getPipelineBulkTargets(bulk.operation, props.pipelineApplications, props.namesMap),
    [bulk.operation, props.namesMap, props.pipelineApplications],
  );

  const readyTargets = getReadyTargets(targets);
  const unavailableTargets = readyTargets.filter((target) => !canPrepareBulkEmail(target));

  const draft = useBulkEmailDraft({
    applicationId: readyTargets.find(canPrepareBulkEmail)?.item.selectedTargetId,
    orgId: props.orgId,
    open: props.open,
  });

  useEffect(() => {
    if (!props.open) setPreparationError(null);
  }, [props.open]);

  const handleOpenChange = (open: boolean) => {
    if (!open) bulk.discardDraft();

    props.onOpenChange(open);
  };

  const submit = async () => {
    const draftResult = draft.readDraft();

    if (!draftResult.draft) {
      toast.error(draftResult.error ?? 'Enter the email content.');
      return;
    }

    if (!vaultQuery.data) {
      toast.error('Organization encryption keys are unavailable.');
      return;
    }

    try {
      const prepared = await prepareBulkEmailPayloads({
        targets: readyTargets,
        draft: draftResult.draft,
        orgId: props.orgId,
        vaultKey: vaultQuery.data,
        purpose: 'send',
      });

      if (prepared.error) {
        setPreparationError(prepared.error);
        return;
      }

      setPreparationError(null);
      await bulk.commit({ excludedItemIds: prepared.excludedItemIds }, prepared.payloads);
    } catch (error) {
      setPreparationError(getProductErrorMessage(error, 'The encrypted emails could not be prepared.'));
    }
  };

  const executableCount = readyTargets.length - unavailableTargets.length;

  return {
    bulk,
    draft,
    targets,
    unavailableTargets,
    preparationError,
    executableCount,
    vaultError: vaultQuery.isError,
    submitDisabled: vaultQuery.isLoading || vaultQuery.isError || !vaultQuery.data || executableCount === 0,
    handleOpenChange,
    submit,
  };
}

function invalidateEmailSurfaces(queryClient: ReturnType<typeof useQueryClient>, operation: BulkOperation) {
  queryClient.invalidateQueries({ queryKey: qk.pipeline.root() });
  queryClient.invalidateQueries({ queryKey: qk.candidate.activityRoot() });

  for (const item of operation.items) {
    queryClient.invalidateQueries({ queryKey: qk.application.detail(item.selectedTargetId) });
    queryClient.invalidateQueries({ queryKey: qk.application.emails(item.selectedTargetId) });
  }
}
