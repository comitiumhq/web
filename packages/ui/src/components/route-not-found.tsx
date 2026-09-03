import type { ReactNode } from 'react';

interface RouteNotFoundProps {
  /** Optional CTA button — pass a typed `<Link>` wrapped in `<Button asChild>`. */
  action?: ReactNode;
  title?: string;
  description?: string;
}

export function RouteNotFound({
  action,
  title = 'Page not found',
  description = "The page you're looking for doesn't exist or may have moved.",
}: RouteNotFoundProps) {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16 text-center">
      <div className="flex max-w-sm flex-col items-center">
        <p className="text-heading-20 text-muted-foreground">404</p>
        <h1 className="mt-2 text-heading-32">{title}</h1>
        <p className="mt-3 text-copy-16 text-muted-foreground">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}
