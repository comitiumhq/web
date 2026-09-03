import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import { MapPinIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { EntitySettingsPage } from '@/components/features/settings-library/entity-settings-page';
import { useQueryOrgLocations } from '@/hooks/queries/use-query-org-structure';
import type { OrgLocation } from '@/lib/schemas/org-structure';

import { LocationRow } from './location-row';
import { LocationSheet } from './location-sheet';

type TabValue = 'active' | 'archived';

const LOCATION_COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'type', header: 'Type' },
  { id: 'updated', header: 'Updated', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-40' },
  { header: 'Type', cellWidth: 'w-20' },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

interface LocationsSettingsListProps {
  orgId: string;
}

function sortLocations(locations: OrgLocation[]) {
  return [...locations].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.name.localeCompare(b.name);
  });
}

export function LocationsSettingsList({ orgId }: LocationsSettingsListProps) {
  const { data, isLoading, error } = useQueryOrgLocations(orgId, { includeArchived: true });
  const [tab, setTab] = useState<TabValue>('active');
  const [editTarget, setEditTarget] = useState<OrgLocation | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const locations = data?.data ?? [];
  const sorted = useMemo(() => sortLocations(locations), [locations]);
  const activeLocations = useMemo(() => sorted.filter((location) => !location.isArchived), [sorted]);
  const archivedLocations = useMemo(() => sorted.filter((location) => location.isArchived), [sorted]);
  const shownLocations = tab === 'archived' ? archivedLocations : activeLocations;

  const handleTabChange = useCallback((value: string) => setTab(value as TabValue), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCloseEdit = useCallback((open: boolean) => {
    if (!open) {
      setEditTarget(null);
    }
  }, []);

  return (
    <>
      <EntitySettingsPage
        title="Locations"
        tab={tab}
        activeCount={activeLocations.length}
        archivedCount={archivedLocations.length}
        isError={Boolean(error)}
        errorDescription="We couldn't load locations. Please try again."
        onTabChange={handleTabChange}
        onCreateClick={handleOpenCreate}
        createLabel="New location"
      >
        <LocationsTable
          orgId={orgId}
          isLoading={isLoading}
          locations={shownLocations}
          onEdit={setEditTarget}
          tab={tab}
        />
      </EntitySettingsPage>

      <LocationSheet orgId={orgId} location={editTarget} open={!!editTarget} onOpenChange={handleCloseEdit} />
      <LocationSheet orgId={orgId} location={null} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

interface LocationsTableProps {
  orgId: string;
  isLoading: boolean;
  locations: OrgLocation[];
  tab: TabValue;
  onEdit: (location: OrgLocation) => void;
}

function LocationsTable({ orgId, isLoading, locations, tab, onEdit }: LocationsTableProps) {
  if (isLoading) {
    return (
      <TableSkeleton
        columns={SKELETON_COLUMNS}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      />
    );
  }

  if (locations.length === 0) {
    const title = tab === 'archived' ? 'No archived locations' : 'No locations yet';
    const description =
      tab === 'archived'
        ? 'Archived locations will appear here.'
        : 'Create the first location before adding location-aware job details.';

    return <EmptyStateCard icon={MapPinIcon} title={title} description={description} />;
  }

  return (
    <DataTable
      columns={LOCATION_COLUMNS}
      className={DATA_TABLE_CLASS}
      scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
    >
      {locations.map((location) => (
        <LocationRow key={location.id} orgId={orgId} location={location} onEdit={onEdit} />
      ))}
    </DataTable>
  );
}
