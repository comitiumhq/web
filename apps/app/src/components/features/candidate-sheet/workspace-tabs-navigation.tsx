import type { ReactNode } from 'react';

interface WorkspaceTabsNavigationProps {
  children: ReactNode;
}

export function WorkspaceTabsNavigation({ children }: WorkspaceTabsNavigationProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 bg-background/80 backdrop-blur-md after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-4 after:translate-y-full after:bg-gradient-to-b after:from-background/80 after:to-background/0 supports-[backdrop-filter]:bg-background/65">
      {children}
    </div>
  );
}
