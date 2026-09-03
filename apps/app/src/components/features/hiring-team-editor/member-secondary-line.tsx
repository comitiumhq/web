import type { HiringTeamEditorMember } from './types';
import { getHiringTeamMemberSecondaryLine } from './utils';

interface MemberSecondaryLineProps {
  member: HiringTeamEditorMember;
}

export function MemberSecondaryLine({ member }: MemberSecondaryLineProps) {
  const secondary = getHiringTeamMemberSecondaryLine(member);

  if (!secondary) {
    return null;
  }

  return <span className="truncate text-label-12 text-muted-foreground">{secondary}</span>;
}
