import { Button } from '@comitium/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@comitium/ui/sheet';
import { ListChecksIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useQueryWorkspaceSetup } from '@/hooks/queries/use-query-workspace-setup';
import { usePermissions } from '@/hooks/use-permissions';
import { WorkspaceSetupCard, WorkspaceSetupCardSkeleton } from './workspace-setup-card';

interface WorkspaceSetupShellProps {
  children: ReactNode;
  orgId: string;
}

export function WorkspaceSetupShell({ children, orgId }: WorkspaceSetupShellProps) {
  const { isAdmin } = usePermissions();
  const setupQuery = useQueryWorkspaceSetup(orgId, isAdmin);
  const setup = setupQuery.data;
  const showSetup = isAdmin && !setupQuery.isError && (setupQuery.isLoading || setup?.complete === false);

  return (
    <>
      <div className="h-full min-h-0">{children}</div>

      {showSetup && (
        <aside
          aria-label="Getting started"
          className="fixed bottom-4 left-4 z-40 hidden w-fit max-w-[calc(100vw-2rem)] xl:block"
        >
          {setup ? <WorkspaceSetupCard key={orgId} orgId={orgId} setup={setup} /> : <WorkspaceSetupCardSkeleton />}
        </aside>
      )}

      {showSetup && setup && (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="lg"
              className="fixed bottom-4 left-4 z-40 gap-2 bg-popover/95 shadow-lg backdrop-blur-sm xl:hidden"
              aria-label={`${setup.completedRequired} of ${setup.requiredTotal} getting started steps complete. Open checklist.`}
            >
              <ListChecksIcon weight="bold" />
              <span>Getting started</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-label-12 text-muted-foreground tabular-nums">
                {setup.completedRequired}/{setup.requiredTotal}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[calc(100%-1rem)] max-w-sm overflow-y-auto p-4 pt-14 sm:w-[22rem]">
            <SheetHeader className="sr-only">
              <SheetTitle>Getting started</SheetTitle>
              <SheetDescription>Complete the required organization setup steps.</SheetDescription>
            </SheetHeader>
            <WorkspaceSetupCard key={orgId} orgId={orgId} setup={setup} />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
