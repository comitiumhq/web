import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../lib/cn';

interface PageHeaderProps extends Omit<ComponentProps<'header'>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-3', className)} {...props}>
      <div className="min-w-0">
        <h1 className="min-w-0 text-heading-24">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-copy-14 text-muted-foreground">{description}</p>}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export { PageHeader };
