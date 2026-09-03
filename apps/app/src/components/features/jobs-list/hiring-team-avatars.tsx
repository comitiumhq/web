import type { OrgJobListItem } from '@comitium/schemas/jobs';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { memo } from 'react';

interface HiringTeamAvatarsProps {
  team: OrgJobListItem['hiringTeam'];
}

export const HiringTeamAvatars = memo(function HiringTeamAvatars({ team }: HiringTeamAvatarsProps) {
  if (team.total === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const overflow = team.total - team.members.length;

  return (
    <div className="flex items-center">
      <div className="flex items-center [&>*+*]:-ml-1.5">
        {team.members.map((m, i) => (
          <InitialsAvatar
            key={i}
            identity={{ walletAddress: '', name: m.name }}
            size="sm"
            className="ring-2 ring-card"
          />
        ))}
      </div>
      {overflow > 0 && <span className="text-label-12 text-muted-foreground pl-2">+{overflow}</span>}
    </div>
  );
});
