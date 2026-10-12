import type { ReactNode } from 'react';

import { Badge } from './badge';
import { StatusBadge, type StatusBadgeProps } from './status-badge';

export const KANBAN_COLUMN_CLASS = 'flex w-72 shrink-0 flex-col rounded-xl p-1.5';
export const KANBAN_COLUMN_BODY_CLASS = 'flex min-h-0 flex-1 flex-col gap-2 rounded-xl bg-kanban-column p-2 pb-4';
export const KANBAN_CARD_SURFACE_CLASS =
  'relative flex h-30 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-transparent bg-card bg-clip-padding p-3 text-left';

export function KanbanColumnHeader({ name, total }: { name: string; total: number }) {
  return (
    <div data-slot="kanban-column-header" className="mb-2.5 flex items-center gap-2 px-1.5 pt-0.5">
      <h3 data-slot="kanban-column-name" className="truncate text-label-14 font-medium text-foreground/75">
        {name}
      </h3>
      <Badge
        variant="secondary"
        className="h-5 shrink-0 bg-foreground/5 px-1.5 text-xs text-muted-foreground tabular-nums"
      >
        {total}
      </Badge>
    </div>
  );
}

interface KanbanCardBodyProps {
  name: string;
  company: string | null;
  status: StatusBadgeProps | null;
  footer: ReactNode;
}

export function KanbanCardBody({ name, company, status, footer }: KanbanCardBodyProps) {
  return (
    <>
      <div className="min-w-0">
        <p data-slot="kanban-card-name" className="truncate text-heading-14 text-foreground">
          {name}
        </p>
        {company && (
          <p data-slot="kanban-card-company" className="mt-0.5 truncate text-label-12 text-muted-foreground">
            {company}
          </p>
        )}
      </div>

      {status && (
        <div data-slot="kanban-card-status" className="mt-2.5 flex">
          <StatusBadge {...status} />
        </div>
      )}

      {footer && <p className="mt-auto pt-2 text-label-12 tabular-nums text-meta-foreground">{footer}</p>}
    </>
  );
}
