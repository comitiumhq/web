import type { MemberDisplayIdentity } from '@comitium/ui/display-name';
import type { OrgTeamMember } from '@/lib/schemas/org';

type InterviewerMember = MemberDisplayIdentity & Pick<OrgTeamMember, 'userId'> & { timezone?: string | null };

export interface SelectedInterviewer {
  userId: string;
  member: InterviewerMember;
  role: 'interviewer' | 'shadow' | 'lead';
}
