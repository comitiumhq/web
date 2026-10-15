import { isDefined } from '@comitium/schemas/guards';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import { formatInTimezone, getCurrentDate } from '@comitium/ui/date';
import { Spinner } from '@comitium/ui/spinner';
import type { ReactNode } from 'react';

import type { ZkIdentityFailureCode, ZkIdentityStatus } from '../../zk-identity';
import { ZkPassportMark } from './zkpassport-mark';

const FAILURE_MESSAGES: Record<ZkIdentityFailureCode, string> = {
  proof_invalid: 'The proof did not satisfy this verification request.',
  identity_already_linked: 'This document is already linked to an account. Please use a different document.',
  document_expired: 'This document has expired. Use a valid document.',
};

export function ZkIdentityCard({
  status,
  failureCode,
  isStarting,
  onStart,
}: {
  status: ZkIdentityStatus;
  failureCode: ZkIdentityFailureCode | null;
  isStarting: boolean;
  onStart: () => void;
}) {
  const presentation = getDocumentPresentation(status);
  const canStart = status.status === 'not_started' || status.canReplace;

  return (
    <IdentityCard title={presentation.title} description={presentation.description} badge={presentation.badge}>
      {failureCode || canStart ? (
        <CardContent className="space-y-3">
          {failureCode ? (
            <p role="alert" className="text-sm text-destructive-text">
              {FAILURE_MESSAGES[failureCode]}
            </p>
          ) : null}
          {canStart ? (
            <Button onClick={onStart} disabled={isStarting}>
              {isStarting ? <Spinner /> : null}
              {isStarting ? 'Preparing…' : presentation.actionLabel}
            </Button>
          ) : null}
        </CardContent>
      ) : null}
    </IdentityCard>
  );
}

function getDocumentPresentation(status: ZkIdentityStatus) {
  if (status.status === 'not_started') {
    return {
      title: (
        <span className="flex items-center gap-2">
          <ZkPassportMark className="size-6 shrink-0" />
          <span>Verify with zkPassport</span>
        </span>
      ),
      description: 'A simple, secure way to verify your identity. Private by design.',
      badge: null,
      actionLabel: 'Verify',
    };
  }

  const expired = status.documentExpiresOn <= formatInTimezone(getCurrentDate(), 'UTC', 'yyyy-MM-dd');
  const expiryDate = formatInTimezone(status.documentExpiresOn, 'UTC', 'MMM d, yyyy');

  return {
    title: expired ? 'Document expired' : 'Identity verified',
    description: expired
      ? `Expired on ${expiryDate}. Link a new document to update your verification.`
      : `Document valid until ${expiryDate}.`,
    badge: <Badge variant={expired ? 'secondary' : 'success'}>{expired ? 'Expired' : 'Verified'}</Badge>,
    actionLabel: 'Replace document',
  };
}

export function ZkIdentityLoading() {
  return (
    <Card size="sm" className="w-full max-w-3xl">
      <CardContent className="flex min-h-24 items-center justify-center">
        <Spinner />
      </CardContent>
    </Card>
  );
}

export function ZkIdentityUnavailable() {
  return (
    <IdentityCard
      title="Verification unavailable"
      description="The verification status could not be loaded. Refresh the page to try again."
      badge={<Badge variant="destructive">Unavailable</Badge>}
    />
  );
}

function IdentityCard({
  children,
  description,
  badge,
  title,
}: {
  children?: ReactNode;
  description: string;
  badge: ReactNode;
  title: ReactNode;
}) {
  return (
    <Card size="sm" className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-2xl whitespace-pre-line leading-6">{description}</CardDescription>
        {isDefined(badge) ? <CardAction>{badge}</CardAction> : null}
      </CardHeader>
      {children}
    </Card>
  );
}
