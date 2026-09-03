import type { CandidateProfile } from '@comitium/schemas/candidates';
import { TableSelectionDock, type TableSelectionDockAction } from '@comitium/ui/table-selection-dock';
import { ArchiveIcon, EnvelopeSimpleIcon, TagIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import type { PipelineCandidate } from '@/lib/schemas/pipeline';
import type { PipelineTab } from '../types';
import { BulkArchiveSheet } from './archive/bulk-archive-sheet';
import { BulkAssignCandidateTagSheet } from './candidate-tag/bulk-assign-candidate-tag-sheet';
import { BulkEmailSheet } from './email/bulk-email-sheet';
import type { PipelineBulkAction } from './model';

interface BulkOperationsProps {
  activeTab: PipelineTab;
  selectedApplications: readonly PipelineCandidate[];
  pipelineApplications: readonly PipelineCandidate[];
  namesMap: ReadonlyMap<string, CandidateProfile>;
  orgId: string;
  maxItems?: number;
  onClear: () => void;
  onCompleted: (applicationIds: readonly string[]) => void;
}

export function BulkOperations({
  activeTab,
  selectedApplications,
  pipelineApplications,
  namesMap,
  orgId,
  maxItems,
  onClear,
  onCompleted,
}: BulkOperationsProps) {
  const [activeAction, setActiveAction] = useState<PipelineBulkAction | null>(null);
  const { runUnlocked } = useEncryptionUnlocked(orgId);

  const openAction = useCallback(
    (action: PipelineBulkAction) => runUnlocked(() => setActiveAction(action)),
    [runUnlocked],
  );

  const actions = useMemo<TableSelectionDockAction[]>(() => {
    const items: TableSelectionDockAction[] = [
      {
        id: 'assign_candidate_tag',
        label: 'Tags',
        icon: TagIcon,
        onSelect: () => openAction('assign_candidate_tag'),
      },
    ];

    if (activeTab === 'review' || activeTab === 'offer') {
      items.push(
        { id: 'email', label: 'Email', icon: EnvelopeSimpleIcon, onSelect: () => openAction('email') },
        {
          id: 'archive',
          label: 'Archive',
          icon: ArchiveIcon,
          destructive: true,
          onSelect: () => openAction('archive'),
        },
      );
    }

    return items;
  }, [activeTab, openAction]);

  const selectedApplicationIds = useMemo(
    () => selectedApplications.map((application) => application.id),
    [selectedApplications],
  );
  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setActiveAction(null);
    }
  };

  return (
    <>
      <TableSelectionDock
        selectedCount={selectedApplications.length}
        selectedLabel={maxItems ? `${selectedApplications.length} of ${maxItems} selected` : undefined}
        actions={actions}
        onClear={onClear}
      />

      <BulkAssignCandidateTagSheet
        open={activeAction === 'assign_candidate_tag'}
        onOpenChange={handleSheetOpenChange}
        pipelineApplications={pipelineApplications}
        namesMap={namesMap}
        orgId={orgId}
        applicationIds={selectedApplicationIds}
        onCompleted={onCompleted}
      />
      <BulkEmailSheet
        open={activeAction === 'email'}
        onOpenChange={handleSheetOpenChange}
        pipelineApplications={pipelineApplications}
        namesMap={namesMap}
        orgId={orgId}
        applicationIds={selectedApplicationIds}
        onCompleted={onCompleted}
      />
      <BulkArchiveSheet
        open={activeAction === 'archive'}
        onOpenChange={handleSheetOpenChange}
        pipelineApplications={pipelineApplications}
        namesMap={namesMap}
        orgId={orgId}
        applicationIds={selectedApplicationIds}
        onCompleted={onCompleted}
      />
    </>
  );
}
