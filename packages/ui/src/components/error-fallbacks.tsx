import { WarningDiamondIcon, WarningIcon } from '@phosphor-icons/react';
import type { FallbackProps } from 'react-error-boundary';
import { cn } from '../lib/cn';
import { Button } from './button';
import { EmptyState } from './empty-state';

interface RouteErrorProps {
  error: unknown;
  reset: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="flex items-center justify-center px-4">
      <EmptyState
        icon={WarningDiamondIcon}
        title="Something went wrong"
        description="An unexpected error occurred. Please try again."
      >
        {import.meta.env.DEV && <p className="mt-2 max-w-xl text-copy-13 text-muted-foreground">{message}</p>}
        <Button onClick={reset} variant="outline" className="mt-4">
          Try again
        </Button>
      </EmptyState>
    </div>
  );
}

export function RootErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <WarningIcon className="mx-auto mb-4 size-12 text-destructive" />
        <h1 className="mb-2 text-heading-20">Something went wrong</h1>
        <p className="mb-6 text-copy-14 text-muted-foreground">
          An unexpected error occurred. Please try reloading the page.
        </p>

        {import.meta.env.DEV && error instanceof Error && (
          <pre className="mb-6 max-h-32 overflow-auto rounded-md bg-muted p-3 text-left text-copy-12">
            {error.message}
          </pre>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={resetErrorBoundary}>
            Try again
          </Button>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
        </div>
      </div>
    </div>
  );
}

interface FeatureErrorFallbackProps extends FallbackProps {
  title?: string;
  className?: string;
}

export function FeatureErrorFallback({
  error,
  resetErrorBoundary,
  title = 'Failed to load',
  className,
}: FeatureErrorFallbackProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <WarningIcon className="mb-3 size-8 text-destructive" />
      <p className="mb-1 text-label-14">{title}</p>
      <p className="mb-4 text-copy-12 text-muted-foreground">Something went wrong. Please try again.</p>

      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mb-4 max-h-24 w-full max-w-sm overflow-auto rounded-md bg-muted p-2 text-left text-copy-12">
          {error.message}
        </pre>
      )}

      <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
}
