import type { HiringTeamRole } from '@comitium/schemas/jobs';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { EmptyState } from '@comitium/ui/empty-state';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Skeleton } from '@comitium/ui/skeleton';
import { WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import { memo, useCallback, useState } from 'react';
import { HiringTeamIcon } from '@/lib/constants/domain-icons';
import { isDefined } from '@/lib/utils';

import { MemberSecondaryLine } from './member-secondary-line';
import type { HiringTeamEditorMember } from './types';
import { getHiringTeamRoleLabel, HIRING_TEAM_ROLE_OPTIONS } from './utils';

const SKELETON_ROWS = ['s1', 's2', 's3'];

interface HiringTeamListProps {
  members: HiringTeamEditorMember[];
  isLoading: boolean;
  isError: boolean;
  readOnly: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  onChangeRole?: (userId: string, role: HiringTeamRole) => void;
  onRemoveMember?: (userId: string) => void;
}

export function HiringTeamList({
  members,
  isLoading,
  isError,
  readOnly,
  isUpdating,
  isRemoving,
  onChangeRole,
  onRemoveMember,
}: HiringTeamListProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
        {SKELETON_ROWS.map((key, index) => (
          <HiringTeamRowSkeleton key={key} divided={index > 0} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState icon={WarningCircleIcon} title="Couldn't load team members" description="Try refreshing the page." />
    );
  }

  if (members.length === 0) {
    return (
      <EmptyStateCard
        icon={HiringTeamIcon}
        title="No team members yet"
        description="Add a teammate to collaborate on this job."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      {members.map((member, index) => (
        <HiringTeamRow
          key={member.userId}
          member={member}
          divided={index > 0}
          canEditRole={!readOnly && isDefined(onChangeRole)}
          canRemove={!readOnly && isDefined(onRemoveMember)}
          isUpdating={isUpdating}
          isRemoving={isRemoving}
          onChangeRole={onChangeRole}
          onRemoveMember={onRemoveMember}
        />
      ))}
    </div>
  );
}

interface HiringTeamRowProps {
  member: HiringTeamEditorMember;
  divided: boolean;
  canEditRole: boolean;
  canRemove: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  onChangeRole?: (userId: string, role: HiringTeamRole) => void;
  onRemoveMember?: (userId: string) => void;
}

const HiringTeamRow = memo(function HiringTeamRow({
  member,
  divided,
  canEditRole,
  canRemove,
  isUpdating,
  isRemoving,
  onChangeRole,
  onRemoveMember,
}: HiringTeamRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const displayName = getMemberDisplayName(member);

  const handleRoleChange = useCallback(
    (value: string) => onChangeRole?.(member.userId, value as HiringTeamRole),
    [member.userId, onChangeRole],
  );
  const handleRemoveRequest = useCallback(() => {
    setConfirmOpen(true);
  }, []);
  const handleRemoveConfirm = useCallback(() => {
    onRemoveMember?.(member.userId);
    setConfirmOpen(false);
  }, [member.userId, onRemoveMember]);

  const editableRole = canEditRole && (member.role === 'hiring_member' || member.role === 'hiring_manager');

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${divided ? 'border-t border-border' : ''}`}>
      <InitialsAvatar identity={member} size="md" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label-14 font-medium">{displayName}</span>
        <MemberSecondaryLine member={member} />
      </div>

      {editableRole ? (
        <Select value={member.role ?? undefined} onValueChange={handleRoleChange} disabled={isUpdating}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HIRING_TEAM_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Badge variant="secondary">{getHiringTeamRoleLabel(member.role)}</Badge>
      )}

      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Remove ${displayName}`}
          onClick={handleRemoveRequest}
          disabled={isRemoving}
        >
          <XIcon className="text-muted-foreground" />
        </Button>
      ) : null}

      {canRemove ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Remove from hiring team?"
          description={`${displayName} will be removed from this job's hiring team and default activity assignments. Access from other roles or grants is not affected.`}
          actionLabel="Remove"
          pendingLabel="Removing..."
          onConfirm={handleRemoveConfirm}
          isPending={isRemoving}
        />
      ) : null}
    </div>
  );
});

function HiringTeamRowSkeleton({ divided }: { divided: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${divided ? 'border-t border-border' : ''}`}>
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="size-8 rounded-md" />
    </div>
  );
}
