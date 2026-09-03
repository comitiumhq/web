import type { HiringTeamRole } from '@comitium/schemas/jobs';
import type { OrgTeamMember } from '@/lib/schemas/org';

export interface HiringTeamEditorMember {
  userId: string;
  email: string | null;
  name: string | null;
  role: string | null;
}

export interface HiringTeamEditorProps {
  members: HiringTeamEditorMember[];
  availableMembers: OrgTeamMember[];
  isLoading?: boolean;
  isError?: boolean;
  readOnly?: boolean;
  onAddMember?: (member: OrgTeamMember, role: HiringTeamRole) => void;
  onChangeRole?: (userId: string, role: HiringTeamRole) => void;
  onRemoveMember?: (userId: string) => void;
  isAdding?: boolean;
  isUpdating?: boolean;
  isRemoving?: boolean;
}
