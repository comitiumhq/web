import type { ReactNode } from 'react';

interface ActivityEventRowProps {
  avatar: ReactNode;
  label: string;
  actor: string | null;
  subline: string | null;
  time: ReactNode;
}

export function ActivityEventRow({ avatar, label, actor, subline, time }: ActivityEventRowProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {avatar}
      <div className="flex-1 min-w-0">
        <p className="text-label-13">
          <span className="font-medium text-content-foreground">{label}</span>
          {actor && <span className="text-muted-foreground"> by {actor}</span>}
        </p>
        {subline && <p className="text-label-12 text-meta-foreground mt-0.5">{subline}</p>}
      </div>
      {time}
    </div>
  );
}
