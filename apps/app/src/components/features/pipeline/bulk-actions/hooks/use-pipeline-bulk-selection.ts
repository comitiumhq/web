import { functionalUpdate, type OnChangeFn, type RowSelectionState } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';
import { reconcilePipelineBulkSelection } from '../model';

export function usePipelineBulkSelection(
  pipelineApplications: readonly PipelineCandidate[],
  maxItems: number | undefined,
) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const applicationIds = useMemo(
    () => pipelineApplications.map((pipelineApplication) => pipelineApplication.id),
    [pipelineApplications],
  );

  const selectedApplications = useMemo(
    () => pipelineApplications.filter((pipelineApplication) => rowSelection[pipelineApplication.id]),
    [pipelineApplications, rowSelection],
  );

  const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      setRowSelection((current) => {
        const next = functionalUpdate(updater, current);
        return reconcilePipelineBulkSelection(next, applicationIds, maxItems);
      });
    },
    [applicationIds, maxItems],
  );

  const clear = useCallback(() => setRowSelection({}), []);

  const removeCompleted = useCallback((completedApplicationIds: readonly string[]) => {
    const completed = new Set(completedApplicationIds);
    setRowSelection((current) =>
      Object.fromEntries(Object.entries(current).filter(([applicationId]) => !completed.has(applicationId))),
    );
  }, []);

  useEffect(() => {
    setRowSelection((current) => reconcilePipelineBulkSelection(current, applicationIds, maxItems));
  }, [applicationIds, maxItems]);

  return {
    selectedApplications,
    rowSelection,
    onRowSelectionChange,
    clear,
    removeCompleted,
  };
}
