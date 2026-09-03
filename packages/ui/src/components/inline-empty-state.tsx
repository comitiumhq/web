import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

interface InlineEmptyStateProps {
  icon: PhosphorIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function InlineEmptyState({ icon: Icon, title, description, action, className }: InlineEmptyStateProps) {
  return (
    <div className={cn('flex min-h-14 items-center gap-3 rounded-xl bg-muted/50 px-4 py-3 text-left', className)}>
      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-label-14 text-foreground">{title}</span>
        <span className="mt-0.5 block text-copy-14 text-muted-foreground">{description}</span>
      </span>
      {action && <span className="ml-auto shrink-0">{action}</span>}
    </div>
  );
}
