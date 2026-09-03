import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

interface EmptyStateProps {
  icon: PhosphorIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-7 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="mb-2 text-heading-20">{title}</h2>
      {description && <p className="text-copy-14 text-muted-foreground max-w-sm">{description}</p>}
      {children}
    </div>
  );
}
