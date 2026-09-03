import { isDefined } from '@/lib/utils';

import { HiringTeamComposer } from './hiring-team-composer';
import { HiringTeamList } from './hiring-team-list';
import type { HiringTeamEditorProps } from './types';

export type { HiringTeamEditorMember } from './types';

export function HiringTeamEditor({
  members,
  availableMembers,
  isLoading = false,
  isError = false,
  readOnly = false,
  onAddMember,
  onChangeRole,
  onRemoveMember,
  isAdding = false,
  isUpdating = false,
  isRemoving = false,
}: HiringTeamEditorProps) {
  const canAddMembers = !readOnly && isDefined(onAddMember);

  return (
    <div className="flex flex-col gap-4">
      {canAddMembers ? (
        <HiringTeamComposer availableMembers={availableMembers} isAdding={isAdding} onAdd={onAddMember} />
      ) : null}

      <HiringTeamList
        members={members}
        isLoading={isLoading}
        isError={isError}
        readOnly={readOnly}
        isUpdating={isUpdating}
        isRemoving={isRemoving}
        onChangeRole={onChangeRole}
        onRemoveMember={onRemoveMember}
      />
    </div>
  );
}
