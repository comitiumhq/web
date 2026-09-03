import { useCallback, useMemo, useState } from 'react';

import { splitActiveArchived } from './entity-table-utils';
import type { ArchivableEntity, EntityTabValue } from './types';

interface UseEntitySettingsStateParams<T extends ArchivableEntity> {
  rows: T[];
  compareRows: (a: T, b: T) => number;
}

export function useEntitySettingsState<T extends ArchivableEntity>({
  rows,
  compareRows,
}: UseEntitySettingsStateParams<T>) {
  const [tab, setTab] = useState<EntityTabValue>('active');
  const [editTarget, setEditTarget] = useState<T | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const sortedRows = useMemo(() => [...rows].sort(compareRows), [rows, compareRows]);
  const { activeRows, archivedRows } = useMemo(() => splitActiveArchived(sortedRows), [sortedRows]);

  const handleTabChange = useCallback((nextTab: EntityTabValue) => {
    setTab(nextTab);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handleCloseEdit = useCallback((open: boolean) => {
    if (!open) {
      setEditTarget(null);
    }
  }, []);

  return {
    activeRows,
    archivedRows,
    createOpen,
    editTarget,
    handleCloseEdit,
    handleOpenCreate,
    handleTabChange,
    setCreateOpen,
    setEditTarget,
    tab,
  };
}
