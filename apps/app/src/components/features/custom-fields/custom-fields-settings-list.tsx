import { useCallback, useMemo, useState } from 'react';

import { EntitySettingsPage } from '@/components/features/settings-library/entity-settings-page';
import { useQueryCustomFieldsList } from '@/hooks/queries/use-query-custom-fields-list';
import type { CustomFieldRow } from '@/lib/schemas/custom-fields';

import { EMPTY_FIELDS, type TabValue } from './constants';
import { CustomFieldCreateSheet } from './custom-field-create-sheet';
import { CustomFieldEditSheet } from './custom-field-edit-sheet';
import { CustomFieldsList } from './custom-fields-list';

interface CustomFieldsSettingsListProps {
  orgId: string;
}

export function CustomFieldsSettingsList({ orgId }: CustomFieldsSettingsListProps) {
  const { data, isLoading, error } = useQueryCustomFieldsList(orgId, {
    objectType: 'candidate',
    includeArchived: true,
  });

  const [tab, setTab] = useState<TabValue>('active');
  const [editTarget, setEditTarget] = useState<CustomFieldRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fields = data?.data ?? EMPTY_FIELDS;
  const activeFields = useMemo(() => fields.filter((f) => !f.isArchived), [fields]);
  const archivedFields = useMemo(() => fields.filter((f) => f.isArchived), [fields]);

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
        title="Custom Fields"
        tab={tab}
        activeCount={activeFields.length}
        archivedCount={archivedFields.length}
        isError={Boolean(error)}
        errorDescription="We couldn't load custom fields."
        onTabChange={handleTabChange}
        onCreateClick={handleOpenCreate}
        createLabel="New field"
      >
        <CustomFieldsList
          tab={tab}
          isLoading={isLoading}
          orgId={orgId}
          activeFields={activeFields}
          archivedFields={archivedFields}
          onEdit={setEditTarget}
        />
      </EntitySettingsPage>

      <CustomFieldEditSheet orgId={orgId} field={editTarget} open={!!editTarget} onOpenChange={handleCloseEdit} />
      <CustomFieldCreateSheet orgId={orgId} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
