import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import {
  DATA_TABLE_CLASS,
  DATA_TABLE_SCROLL_AREA_CLASS,
  DATA_TABLE_WRAPPER_CLASS,
  DataTable,
  type DataTableColumn,
} from '@comitium/ui/data-table';
import { EmptyState } from '@comitium/ui/empty-state';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { Spinner } from '@comitium/ui/spinner';
import { TablePagination } from '@comitium/ui/table-pagination';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { ArchiveIcon, InfoIcon, LockIcon, TagIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EntitySettingsPage } from '@/components/features/settings-library/entity-settings-page';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import { useCandidateTags } from '@/hooks/use-candidate-tags';
import type { DecryptedCandidateTag } from '@/lib/schemas/candidate-tags';
import { isDefined } from '@/lib/utils';

import { TagEditDialog } from './tag-edit-dialog';
import { TagTableRow } from './tag-table-row';

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Name', cellWidth: 'w-36' },
  { header: 'Created', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

const MAX_TAGS = 100;
const PAGE_SIZE = 10;

const TAG_COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name' },
  { id: 'created', header: 'Created', className: 'hidden sm:table-cell' },
  { id: 'actions', header: 'Actions', className: 'text-right' },
];

type TabValue = 'active' | 'archived';

interface TagSettingsListProps {
  orgId: string;
}

export function TagSettingsList({ orgId }: TagSettingsListProps) {
  const { tags, isLoading: isTagsLoading, error } = useCandidateTags(orgId);
  const { isCryptoActive, ensureUnlocked } = useCryptoUnlock();
  const wrappedVaultKeyQuery = useQueryWrappedVaultKey(orgId);
  const [tab, setTab] = useState<TabValue>('active');
  const [page, setPage] = useState(1);
  const [editTag, setEditTag] = useState<DecryptedCandidateTag | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const sorted = useMemo(() => [...tags].sort((a, b) => a.label.localeCompare(b.label)), [tags]);
  const activeTags = useMemo(() => sorted.filter((t) => !t.isArchived), [sorted]);
  const archivedTags = useMemo(() => sorted.filter((t) => t.isArchived), [sorted]);

  const visibleTags = tab === 'active' ? activeTags : archivedTags;
  const pageRows = visibleTags.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageCount = Math.max(1, Math.ceil(visibleTags.length / PAGE_SIZE));
  const totalCount = tags.length;
  const isPreparingKeys = isCryptoActive && wrappedVaultKeyQuery.isLoading;
  const isLoading = isTagsLoading || isPreparingKeys;
  const hasWrappedVaultKey = isDefined(wrappedVaultKeyQuery.data);
  const canCreateTag = isCryptoActive && hasWrappedVaultKey && !isLoading && !error && totalCount < MAX_TAGS;

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const handleTabChange = useCallback((value: string) => {
    setTab(value as TabValue);
    setPage(1);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  const handleEditDialogChange = useCallback((open: boolean) => {
    if (!open) {
      setEditTag(null);
    }
  }, []);

  const handleUnlock = useCallback(async () => {
    setIsUnlocking(true);

    try {
      await ensureUnlocked();
    } finally {
      setIsUnlocking(false);
    }
  }, [ensureUnlocked]);

  const limitNotice =
    totalCount >= MAX_TAGS ? (
      <Alert variant="default">
        <InfoIcon />
        <AlertTitle>Tag limit reached</AlertTitle>
        <AlertDescription>You've used all {MAX_TAGS} tags. Archive unused tags to free up space.</AlertDescription>
      </Alert>
    ) : null;

  return (
    <>
      <EntitySettingsPage
        title="Candidate Tags"
        tab={tab}
        activeCount={activeTags.length}
        archivedCount={archivedTags.length}
        isError={false}
        errorDescription=""
        onTabChange={handleTabChange}
        onCreateClick={handleOpenCreate}
        createDisabled={!canCreateTag}
        createLabel="New tag"
        notice={limitNotice}
      >
        <TagsContent
          orgId={orgId}
          tab={tab}
          tags={pageRows}
          totalRows={visibleTags.length}
          page={page}
          isCryptoActive={isCryptoActive}
          isLoading={isLoading}
          error={error}
          isUnlocking={isUnlocking}
          onPageChange={setPage}
          onUnlock={handleUnlock}
          onEdit={setEditTag}
        />
      </EntitySettingsPage>

      <TagEditDialog orgId={orgId} tag={editTag} open={!!editTag} onOpenChange={handleEditDialogChange} />
      <TagEditDialog orgId={orgId} tag={null} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

interface TagsContentProps {
  orgId: string;
  tab: TabValue;
  tags: readonly DecryptedCandidateTag[];
  totalRows: number;
  page: number;
  isCryptoActive: boolean;
  isLoading: boolean;
  error: Error | null;
  isUnlocking: boolean;
  onPageChange: (page: number) => void;
  onUnlock: () => void;
  onEdit: (tag: DecryptedCandidateTag) => void;
}

function TagsContent({
  orgId,
  tab,
  tags,
  totalRows,
  page,
  isCryptoActive,
  isLoading,
  error,
  isUnlocking,
  onPageChange,
  onUnlock,
  onEdit,
}: TagsContentProps) {
  if (!isCryptoActive) {
    return <LockedState isUnlocking={isUnlocking} onUnlock={onUnlock} />;
  }

  if (isLoading) {
    return (
      <TableSkeleton
        columns={SKELETON_COLUMNS}
        rows={4}
        className={DATA_TABLE_CLASS}
        scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
      />
    );
  }

  if (error) {
    return <ErrorState />;
  }

  if (totalRows === 0) {
    return <TagsEmptyState tab={tab} />;
  }

  return (
    <div className={DATA_TABLE_WRAPPER_CLASS}>
      <DataTable columns={TAG_COLUMNS} className={DATA_TABLE_CLASS} scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}>
        {tags.map((tag) => (
          <TagTableRow key={tag.id} orgId={orgId} tag={tag} onEdit={onEdit} />
        ))}
      </DataTable>

      <TablePagination page={page} pageSize={PAGE_SIZE} totalRows={totalRows} onPageChange={onPageChange} />
    </div>
  );
}

interface LockedStateProps {
  isUnlocking: boolean;
  onUnlock: () => void;
}

function LockedState({ isUnlocking, onUnlock }: LockedStateProps) {
  return (
    <Card size="sm" className="ring-inset">
      <CardContent className="flex flex-1">
        <div className="flex min-h-52 flex-1 flex-col items-center justify-center py-12 text-center">
          <LockIcon className="mb-3 size-8 text-muted-foreground/40" strokeWidth={1.5} />
          <h3 className="text-heading-14">Your tags are private</h3>
          <p className="text-copy-14 text-muted-foreground mt-1 max-w-sm">
            Verify your identity once to access tags for this session.
          </p>
          <Button size="sm" className="mt-4" onClick={onUnlock} disabled={isUnlocking}>
            {isUnlocking && <Spinner data-icon="inline-start" />}
            {isUnlocking ? 'Verifying...' : 'Access tags'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState() {
  return (
    <div className="h-full flex items-center justify-center pb-8">
      <EmptyState
        icon={WarningCircleIcon}
        title="Something went wrong"
        description="We couldn't load your tags. Please try again."
      />
    </div>
  );
}

const EMPTY_STATE_CONFIG: Record<TabValue, { icon: PhosphorIcon; title: string; description: string }> = {
  active: {
    icon: TagIcon,
    title: 'No tags yet',
    description: 'Get started by creating your first tag.',
  },
  archived: {
    icon: ArchiveIcon,
    title: 'No archived tags',
    description: 'Archive a tag to remove it from active use without deleting it.',
  },
};

interface TagsEmptyStateProps {
  tab: TabValue;
}

function TagsEmptyState({ tab }: TagsEmptyStateProps) {
  const { icon: Icon, title, description } = EMPTY_STATE_CONFIG[tab];

  return <EmptyStateCard icon={Icon} title={title} description={description} />;
}
