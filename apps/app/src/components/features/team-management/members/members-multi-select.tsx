import { getMemberDisplayName, type MemberDisplayIdentity } from '@comitium/ui/display-name';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { PlusIcon, XIcon } from '@phosphor-icons/react';
import { memo, useCallback, useMemo } from 'react';

type MemberOption = MemberDisplayIdentity & { userId: string };

interface MemberOptionsMultiSelectProps {
  members: MemberOption[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
}

export function MemberOptionsMultiSelect({
  members,
  selectedUserIds,
  onChange,
  placeholder = 'Add member',
  emptyLabel = 'No available members',
}: MemberOptionsMultiSelectProps) {
  const memberMap = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members]);
  const availableMembers = useMemo(() => {
    const selected = new Set(selectedUserIds);

    return members.filter((member) => !selected.has(member.userId));
  }, [members, selectedUserIds]);

  const handleAdd = useCallback(
    (userId: string) => {
      onChange([...selectedUserIds, userId]);
    },
    [selectedUserIds, onChange],
  );

  const handleRemove = useCallback(
    (userId: string) => {
      onChange(selectedUserIds.filter((selectedUserId) => selectedUserId !== userId));
    },
    [selectedUserIds, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      {selectedUserIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedUserIds.map((userId) => (
            <MemberChip key={userId} userId={userId} member={memberMap.get(userId) ?? null} onRemove={handleRemove} />
          ))}
        </div>
      )}
      <Select value="" onValueChange={handleAdd} disabled={availableMembers.length === 0}>
        <SelectTrigger className="h-8 w-[200px] text-xs">
          <span className="flex items-center gap-1">
            <PlusIcon className="size-3.5" />
            <SelectValue placeholder={placeholder} />
          </span>
        </SelectTrigger>
        <SelectContent>
          {availableMembers.length === 0 ? (
            <div className="px-2 py-1.5 text-copy-14 text-muted-foreground">{emptyLabel}</div>
          ) : (
            availableMembers.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {getMemberDisplayName(member)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

interface MemberChipProps {
  userId: string;
  member: MemberOption | null;
  onRemove: (userId: string) => void;
}

const MemberChip = memo(function MemberChip({ userId, member, onRemove }: MemberChipProps) {
  const handleClick = useCallback(() => onRemove(userId), [userId, onRemove]);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted pl-1 pr-2 py-0.5">
      {member && <InitialsAvatar identity={member} size="sm" />}
      <span className="text-label-12">{member ? getMemberDisplayName(member) : 'Former member'}</span>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Remove member"
        className="text-muted-foreground hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
});
