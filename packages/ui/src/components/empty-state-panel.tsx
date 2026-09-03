import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Card } from './card';
import { EmptyState } from './empty-state';
import { PageContainer } from './page-container';

interface EmptyStatePanelProps {
  icon: PhosphorIcon;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  fill?: boolean;
}

export function EmptyStatePanel({
  icon,
  title,
  description,
  children,
  className,
  contentClassName,
  fill,
}: EmptyStatePanelProps) {
  return (
    <PageContainer className={cn('pb-6', fill && 'flex min-h-0 flex-1 flex-col', className)}>
      <Card size="sm" className={cn('py-0', fill && 'flex min-h-0 flex-1 flex-col')}>
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          className={cn('py-14', fill && 'min-h-0 flex-1', contentClassName)}
        >
          {children}
        </EmptyState>
      </Card>
    </PageContainer>
  );
}
