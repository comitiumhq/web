import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { formatTimeRemaining } from '@comitium/ui/date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comitium/ui/dropdown-menu';
import { TableCell, TableRow } from '@comitium/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { DotsThreeIcon, EnvelopeIcon, XCircleIcon } from '@phosphor-icons/react';
import { memo, type ReactNode, useCallback, useState } from 'react';
import { useResendInvite } from '@/hooks/mutations/use-resend-invite';
import { useRevokeInvite } from '@/hooks/mutations/use-revoke-invite';
import type { OrgInvite } from '@/lib/schemas/org';

import { getInviteDeliverySummary } from './invite-delivery';

interface InviteRowProps {
  orgId: string;
  invite: OrgInvite;
}

export const InviteRow = memo(function InviteRow({ orgId, invite }: InviteRowProps) {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const { mutate: resend, isPending: isResending } = useResendInvite();
  const { mutate: revoke, isPending: isRevoking } = useRevokeInvite();
  const displayName = invite.name || invite.email;
  const delivery = getInviteDeliverySummary(invite);
  const expiresIn = formatTimeRemaining(invite.expiresAt);
  const isExpired = invite.isExpired || expiresIn === null;
  const anyPending = isResending || isRevoking;

  const handleResend = useCallback(() => {
    resend({ orgId, inviteId: invite.id });
  }, [orgId, invite.id, resend]);

  const handleOpenRevokeDialog = useCallback(() => {
    setRevokeDialogOpen(true);
  }, []);

  const handleConfirmRevoke = useCallback(() => {
    revoke({ orgId, inviteId: invite.id }, { onSuccess: () => setRevokeDialogOpen(false) });
  }, [orgId, invite.id, revoke]);

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex min-w-0 flex-col">
            <span className="text-label-14 max-w-50 truncate">{displayName}</span>
            <span className="text-label-12 text-muted-foreground max-w-50 truncate">{invite.email}</span>
          </div>
        </TableCell>
        <TableCell>
          <StatusTooltip label={delivery.detail}>
            <Badge
              tabIndex={0}
              variant={delivery.variant}
              className="cursor-help"
              aria-label={`${delivery.label}: ${delivery.detail}`}
            >
              {delivery.label}
            </Badge>
          </StatusTooltip>
        </TableCell>
        <TableCell>
          <StatusTooltip label={isExpired ? 'Expired — resend to create a new link' : expiresIn}>
            <Badge
              tabIndex={0}
              variant={isExpired ? 'secondary' : 'warning'}
              className="cursor-help"
              aria-label={isExpired ? 'Expired' : `Pending: ${expiresIn}`}
            >
              {isExpired ? 'Expired' : 'Pending'}
            </Badge>
          </StatusTooltip>
        </TableCell>
        <TableCell>
          <InviteActionsMenu
            isPending={anyPending}
            isResending={isResending}
            onResend={handleResend}
            onRevoke={handleOpenRevokeDialog}
          />
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={revokeDialogOpen}
        onOpenChange={setRevokeDialogOpen}
        title="Revoke this invite?"
        description={
          <>
            This will prevent <strong>{displayName}</strong> from joining with this invite link.
          </>
        }
        actionLabel="Revoke invite"
        pendingLabel="Revoking..."
        isPending={isRevoking}
        onConfirm={handleConfirmRevoke}
      />
    </>
  );
});

interface StatusTooltipProps {
  label: string;
  children: ReactNode;
}

function StatusTooltip({ label, children }: StatusTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

interface InviteActionsMenuProps {
  isPending: boolean;
  isResending: boolean;
  onResend: () => void;
  onRevoke: () => void;
}

function InviteActionsMenu({ isPending, isResending, onResend, onRevoke }: InviteActionsMenuProps) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="size-8 p-0" disabled={isPending}>
            <DotsThreeIcon />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem onClick={onResend} disabled={isPending}>
            <EnvelopeIcon />
            {isResending ? 'Resending…' : 'Resend invite'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onRevoke} disabled={isPending}>
            <XCircleIcon />
            Revoke invite
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
