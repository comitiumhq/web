import type { ReactNode } from 'react';

interface HomeListProps {
  children: ReactNode;
  className?: string;
}

export function HomeList({ children, className }: HomeListProps) {
  return <div className={className}>{children}</div>;
}

export const homeListRowClassName =
  'relative grid min-h-12 items-center gap-3 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';
