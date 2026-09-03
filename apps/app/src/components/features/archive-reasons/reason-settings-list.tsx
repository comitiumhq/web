import { EntitySettingsPage } from '@/components/features/settings-library/entity-settings-page';
import { useEntitySettingsState } from '@/components/features/settings-library/use-entity-settings-state';
import { useQueryArchiveReasonsList } from '@/hooks/queries/use-query-archive-reasons-list';
import { compareBySortOrderThenLabel } from '@/lib/utils';

import { EMPTY_REASONS } from './constants';
import { ReasonEditorDialog } from './reason-edit-dialog';
import { ReasonsList } from './reasons-list';

interface ArchiveReasonsSettingsListProps {
  orgId: string;
}

export function ArchiveReasonsSettingsList({ orgId }: ArchiveReasonsSettingsListProps) {
  const { data, isLoading, error } = useQueryArchiveReasonsList(orgId, { includeArchived: true });
  const reasons = data?.data ?? EMPTY_REASONS;
  const state = useEntitySettingsState({ rows: reasons, compareRows: compareBySortOrderThenLabel });

  return (
    <>
      <EntitySettingsPage
        title="Archive Reasons"
        tab={state.tab}
        activeCount={state.activeRows.length}
        archivedCount={state.archivedRows.length}
        isError={Boolean(error)}
        errorDescription="We couldn't load reasons. Please try again."
        onTabChange={state.handleTabChange}
        onCreateClick={state.handleOpenCreate}
        createLabel="New reason"
      >
        <ReasonsList
          tab={state.tab}
          isLoading={isLoading}
          orgId={orgId}
          activeReasons={state.activeRows}
          archivedReasons={state.archivedRows}
          onEdit={state.setEditTarget}
        />
      </EntitySettingsPage>

      <ReasonEditorDialog
        orgId={orgId}
        reason={state.editTarget}
        open={state.editTarget !== null}
        onOpenChange={state.handleCloseEdit}
      />
      <ReasonEditorDialog orgId={orgId} reason={null} open={state.createOpen} onOpenChange={state.setCreateOpen} />
    </>
  );
}
