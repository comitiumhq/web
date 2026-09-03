import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { cn } from '../lib/cn';
import { Card, CardContent } from './card';

interface EmptyStateCardProps {
  icon: PhosphorIcon;
  title: string;
  description: string;
  className?: string;
}

export function EmptyStateCard({ icon: Icon, title, description, className }: EmptyStateCardProps) {
  return (
    <Card size="sm" className={cn('ring-inset', className)}>
      <CardContent className="flex flex-1">
        <div className="flex min-h-52 flex-1 flex-col items-center justify-center py-12 text-center">
          <Icon className="mb-3 size-8 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-heading-14">{title}</p>
          <p className="text-copy-14 text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
