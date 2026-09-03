import { useCallback, useMemo, useState } from 'react';

import { EntitySettingsPage } from '@/components/features/settings-library/entity-settings-page';
import { useQueryCancelRescheduleReasons } from '@/hooks/queries/use-query-cancel-reschedule-reasons';
import type { ReasonRow } from '@/lib/schemas/cancel-reschedule-reasons';

import { EMPTY_REASONS, type TabValue } from './constants';
import { ReasonEditorSheet } from './reason-edit-dialog';
import { ReasonsList } from './reasons-list';
import { compareReasons, groupByCategory } from './utils';

interface ReasonSettingsListProps {
  orgId: string;
}

export function ReasonSettingsList({ orgId }: ReasonSettingsListProps) {
  const { data, isLoading, error } = useQueryCancelRescheduleReasons(orgId, { includeArchived: true });

  const [tab, setTab] = useState<TabValue>('active');
  const [editTarget, setEditTarget] = useState<ReasonRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const reasons = data?.data ?? EMPTY_REASONS;
  const sorted = useMemo(() => [...reasons].sort(compareReasons), [reasons]);
  const activeReasons = useMemo(() => sorted.filter((r) => !r.isArchived), [sorted]);
  const archivedReasons = useMemo(() => sorted.filter((r) => r.isArchived), [sorted]);
  const groupedActive = useMemo(() => groupByCategory(activeReasons), [activeReasons]);

  const handleTabChange = useCallback((v: string) => setTab(v as TabValue), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseEdit = useCallback((open: boolean) => {
    if (!open) {
      setEditTarget(null);
    }
  }, []);

  return (
    <>
      <EntitySettingsPage
        title="Cancel / Reschedule Reasons"
        tab={tab}
        activeCount={activeReasons.length}
        archivedCount={archivedReasons.length}
        isError={Boolean(error)}
        errorDescription="We couldn't load reasons. Please try again."
        onTabChange={handleTabChange}
        onCreateClick={handleOpenCreate}
        createLabel="New reason"
      >
        <ReasonsList
          tab={tab}
          isLoading={isLoading}
          orgId={orgId}
          activeGrouped={groupedActive}
          archivedReasons={archivedReasons}
          onEdit={setEditTarget}
        />
      </EntitySettingsPage>

      <ReasonEditorSheet orgId={orgId} reason={editTarget} open={!!editTarget} onOpenChange={handleCloseEdit} />
      <ReasonEditorSheet orgId={orgId} reason={null} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
