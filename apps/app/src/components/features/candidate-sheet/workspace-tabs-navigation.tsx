import type { ReactNode } from 'react';

interface WorkspaceTabsNavigationProps {
  children: ReactNode;
}

export function WorkspaceTabsNavigation({ children }: WorkspaceTabsNavigationProps) {
  return <div className="absolute inset-x-0 top-0 z-20 bg-background">{children}</div>;
}
