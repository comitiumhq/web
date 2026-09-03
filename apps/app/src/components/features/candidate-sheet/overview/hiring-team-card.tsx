import type { CandidateSheetConsiderationContext } from '@comitium/schemas/applications';
import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { getHiringTeamRoleLabel } from '@/components/features/hiring-team-editor/utils';

type HiringTeamMember = CandidateSheetConsiderationContext['hiringTeam'][number];
type MemberIdentity = { name: string | null; email?: string | null };
const UNKNOWN_MEMBER_LABEL = 'Unknown member';

interface HiringTeamCardProps {
  members: CandidateSheetConsiderationContext['hiringTeam'];
}

export function HiringTeamCard({ members }: HiringTeamCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Hiring team</CardTitle>
      </CardHeader>

      <CardContent>
        {members.length > 0 ? (
          <div className="flex flex-col divide-y divide-border/70">
            {members.map((member) => (
              <HiringTeamMemberRow key={member.userId} member={member} />
            ))}
          </div>
        ) : (
          <p className="text-copy-14 text-muted-foreground">No hiring team assigned.</p>
        )}
      </CardContent>
    </Card>
  );
}

function HiringTeamMemberRow({ member }: { member: HiringTeamMember }) {
  const displayName = getMemberName(member) ?? UNKNOWN_MEMBER_LABEL;
  const identity = { ...member, name: displayName };

  return (
    <div className="flex min-w-0 items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <InitialsAvatar identity={identity} size="sm" className="shrink-0" />
      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-label-14 font-medium">{displayName}</span>
        <span className="shrink-0 text-label-12 text-muted-foreground">{getHiringTeamRoleLabel(member.role)}</span>
      </div>
    </div>
  );
}

function getMemberName(member: MemberIdentity): string | null {
  return member.name ?? member.email ?? null;
}
