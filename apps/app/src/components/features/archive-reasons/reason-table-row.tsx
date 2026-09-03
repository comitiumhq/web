import { Badge } from '@comitium/ui/badge';
import { TableCell } from '@comitium/ui/table';
import { memo, useCallback, useMemo, useState } from 'react';
import { SoftArchiveTableRow } from '@/components/features/settings-library/soft-archive-table-row';
import { useArchiveArchiveReason, useRestoreArchiveReason } from '@/hooks/mutations/use-archive-reason';
import type { ArchiveReasonRow } from '@/lib/schemas/archive-reasons';

import { ARCHIVE_REASON_OUTCOME_LABELS } from './labels';

interface ReasonTableRowProps {
  orgId: string;
  reason: ArchiveReasonRow;
  onEdit: (reason: ArchiveReasonRow) => void;
}

export const ReasonTableRow = memo(function ReasonTableRow({ orgId, reason, onEdit }: ReasonTableRowProps) {
  const { mutate: archive, isPending: isArchiving } = useArchiveArchiveReason();
  const { mutate: restore, isPending: isRestoring } = useRestoreArchiveReason();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const handleArchive = useCallback(() => {
    archive({ orgId, id: reason.id }, { onSuccess: () => setArchiveDialogOpen(false) });
  }, [archive, orgId, reason.id]);

  const handleRestore = useCallback(() => restore({ orgId, id: reason.id }), [restore, orgId, reason.id]);

  const outcomeCell = useMemo(
    () => (
      <TableCell>
        <Badge variant="secondary">{ARCHIVE_REASON_OUTCOME_LABELS[reason.outcome]}</Badge>
      </TableCell>
    ),
    [reason.outcome],
  );

  const archiveDescription = useMemo(
    () => (
      <>
        <span className="font-medium">&ldquo;{reason.label}&rdquo;</span> will be hidden from the archive picker. Past
        entries keep their snapshot. You can restore it anytime.
      </>
    ),
    [reason.label],
  );

  return (
    <SoftArchiveTableRow
      entity={reason}
      extraCells={outcomeCell}
      archiveDialogOpen={archiveDialogOpen}
      isArchiving={isArchiving}
      isRestoring={isRestoring}
      archiveDialogTitle="Archive this reason?"
      archiveDescription={archiveDescription}
      onArchive={handleArchive}
      onArchiveDialogOpenChange={setArchiveDialogOpen}
      onEdit={onEdit}
      onRestore={handleRestore}
    />
  );
});
