import type { HiringTeamRole } from '@comitium/schemas/jobs';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { SearchSelect, type SearchSelectOption } from '@comitium/ui/search-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { useCallback, useMemo, useState } from 'react';
import type { OrgTeamMember } from '@/lib/schemas/org';

import { HIRING_TEAM_ROLE_OPTIONS } from './utils';

interface HiringTeamComposerProps {
  availableMembers: OrgTeamMember[];
  isAdding: boolean;
  onAdd: (member: OrgTeamMember, role: HiringTeamRole) => void;
}

export function HiringTeamComposer({ availableMembers, isAdding, onAdd }: HiringTeamComposerProps) {
  const [role, setRole] = useState<HiringTeamRole>('hiring_manager');
  const memberOptions = useMemo<SearchSelectOption[]>(
    () =>
      availableMembers.map((member) => ({
        value: member.userId,
        label: getMemberDisplayName(member),
        searchValue: [getMemberDisplayName(member), member.email].filter(Boolean).join(' '),
        description: member.email ?? undefined,
        trailing: member.hasVaultAccess ? undefined : 'No vault',
        disabled: !member.hasVaultAccess,
      })),
    [availableMembers],
  );

  const handleRoleChange = useCallback((value: string) => setRole(value as HiringTeamRole), []);
  const handleSelectMember = useCallback(
    (userId: string | null) => {
      const member = availableMembers.find((candidate) => candidate.userId === userId);

      if (!member) {
        return;
      }

      onAdd(member, role);
    },
    [availableMembers, onAdd, role],
  );

  return (
    <div className="flex w-full flex-col justify-end gap-2 sm:flex-row sm:items-center">
      <Select value={role} onValueChange={handleRoleChange} disabled={isAdding}>
        <SelectTrigger className="w-full sm:w-[180px]">
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

      <SearchSelect
        options={memberOptions}
        value={null}
        onValueChange={handleSelectMember}
        placeholder="Search members..."
        searchPlaceholder="Search members..."
        emptyMessage="No members to add."
        disabled={isAdding}
        className="w-full sm:w-80"
      />
    </div>
  );
}
