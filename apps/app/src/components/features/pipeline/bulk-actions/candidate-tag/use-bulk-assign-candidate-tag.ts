import type { SearchSelectOption } from '@comitium/ui/search-select';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { invalidateCandidateTagSurfaces } from '@/hooks/mutations/use-candidate-tag';
import { useCandidateTags } from '@/hooks/use-candidate-tags';
import type { BulkOperation } from '@/lib/schemas/bulk-operations';
import { useBulkOperation } from '../hooks/use-bulk-operation';
import { getPipelineBulkTargets, getReadyTargets } from '../model';
import { settleBulkOperation } from '../operation/settle-bulk-operation';
import type { PipelineBulkActionSheetProps } from '../types';

export function useBulkAssignCandidateTag(props: PipelineBulkActionSheetProps) {
  const queryClient = useQueryClient();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const tagsQuery = useCandidateTags(props.orgId);

  const handleSettled = useCallback(
    (operation: BulkOperation) => {
      invalidateCandidateTagSurfaces(queryClient);
      settleBulkOperation({
        operation,
        successMessage: 'Tags assigned',
        onCompleted: props.onCompleted,
        onOpenChange: props.onOpenChange,
      });
    },
    [props.onCompleted, props.onOpenChange, queryClient],
  );

  const bulk = useBulkOperation({
    orgId: props.orgId,
    operationType: 'application.assign_candidate_tag',
    targetIds: props.applicationIds,
    open: props.open,
    onSettled: handleSettled,
  });

  const targets = useMemo(
    () => getPipelineBulkTargets(bulk.operation, props.pipelineApplications, props.namesMap),
    [bulk.operation, props.namesMap, props.pipelineApplications],
  );

  const tagOptions = useMemo<SearchSelectOption[]>(
    () =>
      tagsQuery.tags
        .filter((tag) => !tag.isArchived)
        .map((tag) => ({ value: tag.id, label: tag.label, searchValue: tag.label })),
    [tagsQuery.tags],
  );

  useEffect(() => {
    if (!props.open) setTagIds([]);
  }, [props.open]);

  const handleOpenChange = (open: boolean) => {
    if (!open) bulk.discardDraft();

    props.onOpenChange(open);
  };

  const submit = async () => {
    if (tagIds.length === 0) return;

    await bulk.commit({ tagIds });
  };

  return {
    tagIds,
    setTagIds,
    tagOptions,
    tagPlaceholder: getTagPlaceholder(tagsQuery.isLoading, Boolean(tagsQuery.error), tagOptions.length),
    readyCount: getReadyTargets(targets).length,
    tagsLoading: tagsQuery.isLoading,
    tagsError: Boolean(tagsQuery.error),
    bulk,
    targets,
    handleOpenChange,
    submit,
  };
}

function getTagPlaceholder(loading: boolean, hasError: boolean, optionCount: number) {
  if (loading) return 'Loading tags...';
  if (hasError) return 'Tags unavailable';
  if (optionCount === 0) return 'No active tags';

  return 'Select tags';
}
