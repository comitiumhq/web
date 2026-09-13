import type { HiringTeamRole } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { Combobox, type ComboboxOption } from '@comitium/ui/combobox';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { PlusIcon } from '@phosphor-icons/react';
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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const memberOptions = useMemo<ComboboxOption[]>(
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
  const selectedMember = useMemo(
    () => availableMembers.find((member) => member.userId === selectedMemberId) ?? null,
    [availableMembers, selectedMemberId],
  );

  const handleRoleChange = useCallback((value: string) => setRole(value as HiringTeamRole), []);
  const handleSelectMember = useCallback((userId: string | null) => setSelectedMemberId(userId), []);
  const handleAdd = useCallback(() => {
    if (!selectedMember) {
      return;
    }

    onAdd(selectedMember, role);
    setSelectedMemberId(null);
  }, [onAdd, role, selectedMember]);

  return (
    <div className="flex w-full flex-col gap-2">
      <span className="text-label-13 font-medium">Add member</span>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <Combobox
          options={memberOptions}
          value={selectedMemberId}
          onValueChange={handleSelectMember}
          placeholder="Search members..."
          searchPlaceholder="Search members..."
          emptyMessage="No members to add."
          disabled={isAdding}
          ariaLabel="Member"
          className="w-full sm:max-w-sm sm:flex-1"
        />

        <Select value={role} onValueChange={handleRoleChange} disabled={isAdding}>
          <SelectTrigger aria-label="Role" className="w-full sm:w-[180px]">
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

        <Button type="button" onClick={handleAdd} disabled={!selectedMember || isAdding} className="w-full sm:w-auto">
          <PlusIcon data-icon="inline-start" />
          {isAdding ? 'Adding...' : 'Add'}
        </Button>
      </div>
    </div>
  );
}
