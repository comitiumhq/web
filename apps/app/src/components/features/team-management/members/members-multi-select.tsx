import { Autocomplete } from '@comitium/ui/autocomplete';
import { getMemberDisplayName, type MemberDisplayIdentity } from '@comitium/ui/display-name';
import { useMemo } from 'react';
import { MemberAvatar } from '@/components/user/member-avatar';

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

  const options = useMemo(
    () => [
      ...members.map((member) => ({
        value: member.userId,
        label: getMemberDisplayName(member),
        leading: <MemberAvatar identity={member} size="sm" />,
      })),
      ...selectedUserIds
        .filter((userId) => !memberMap.has(userId))
        .map((userId) => ({ value: userId, label: 'Former member' })),
    ],
    [memberMap, members, selectedUserIds],
  );

  return (
    <Autocomplete
      size="sm"
      ariaLabel="Members"
      options={options}
      value={selectedUserIds}
      onValueChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search members…"
      emptyMessage={emptyLabel}
      className="w-full sm:w-[320px]"
    />
  );
}
