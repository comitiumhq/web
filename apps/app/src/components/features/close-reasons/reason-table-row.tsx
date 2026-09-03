import { memo, useCallback, useMemo, useState } from 'react';

import { SoftArchiveTableRow } from '@/components/features/settings-library/soft-archive-table-row';
import { useArchiveCloseReason, useRestoreCloseReason } from '@/hooks/mutations/use-close-reason';
import type { CloseReasonRow } from '@/lib/schemas/close-reasons';

interface ReasonTableRowProps {
  orgId: string;
  reason: CloseReasonRow;
  onEdit: (reason: CloseReasonRow) => void;
}

export const ReasonTableRow = memo(function ReasonTableRow({ orgId, reason, onEdit }: ReasonTableRowProps) {
  const { mutate: archive, isPending: isArchiving } = useArchiveCloseReason();
  const { mutate: restore, isPending: isRestoring } = useRestoreCloseReason();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const handleArchive = useCallback(() => {
    archive({ orgId, id: reason.id }, { onSuccess: () => setArchiveDialogOpen(false) });
  }, [archive, orgId, reason.id]);

  const handleRestore = useCallback(() => restore({ orgId, id: reason.id }), [restore, orgId, reason.id]);

  const archiveDescription = useMemo(
    () => (
      <>
        <span className="font-medium">&ldquo;{reason.label}&rdquo;</span> will be hidden from the close picker. Past
        entries keep their snapshot. You can restore it anytime.
      </>
    ),
    [reason.label],
  );

  return (
    <SoftArchiveTableRow
      entity={reason}
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
