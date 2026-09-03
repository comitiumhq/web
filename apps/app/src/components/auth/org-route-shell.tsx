import { FeatureErrorFallback } from '@comitium/ui/error-fallbacks';
import { type ReactNode, useCallback } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';

import { OrgGuard } from './org-guard';

interface OrgRouteShellProps {
  orgId: string;
  errorTitle: string;
  errorClassName?: string;
  children: (org: MyOrg) => ReactNode;
}

export function OrgRouteShell({ orgId, errorTitle, errorClassName = 'h-full', children }: OrgRouteShellProps) {
  const renderFallback = useCallback(
    (props: FallbackProps) => <FeatureErrorFallback {...props} title={errorTitle} className={errorClassName} />,
    [errorTitle, errorClassName],
  );
  const renderOrgContent = useCallback(
    (org: MyOrg) => <ErrorBoundary fallbackRender={renderFallback}>{children(org)}</ErrorBoundary>,
    [children, renderFallback],
  );

  return <OrgGuard orgId={orgId}>{renderOrgContent}</OrgGuard>;
}
