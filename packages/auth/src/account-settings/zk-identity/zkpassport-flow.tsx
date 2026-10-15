import { formatInTimezone } from '@comitium/ui/date';
import { NullifierType } from '@zkpassport/sdk';
import {
  type QueryBuilder,
  type QueryResult,
  ZKPassportQRCode,
  type ZKPassportQRCodeProps,
} from '@zkpassport/ui/react';
import { useTheme } from 'next-themes';
import { useCallback, useRef } from 'react';

import type { CompleteZkIdentityAttemptInput, ZkIdentityAttempt } from '../../zk-identity';

export interface ZkPassportFlowProps {
  attempt: ZkIdentityAttempt;
  onComplete: (input: CompleteZkIdentityAttemptInput) => Promise<boolean>;
  onError: (message: string) => void;
  onReject: () => void;
}

export function ZkPassportFlow({ attempt, onComplete, onError, onReject }: ZkPassportFlowProps) {
  const { resolvedTheme } = useTheme();
  const submitted = useRef(false);
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const buildQuery = useCallback(
    (builder: QueryBuilder) =>
      builder.raw({ ...attempt.request.query, bind: { custom_data: attempt.challenge } }).done(),
    [attempt],
  );

  const handleSuccess: ZKPassportQRCodeProps['onSuccess'] = async ({ proofs, result }) => {
    if (submitted.current) {
      return false;
    }

    const documentExpiresOn = readDocumentExpiry(result);

    if (!documentExpiresOn) {
      onError('The document expiry date was not disclosed.');

      return false;
    }

    submitted.current = true;

    return onComplete({ challenge: attempt.challenge, proofs, documentExpiresOn });
  };

  return (
    <div className="flex min-w-0 justify-center">
      <ZKPassportQRCode
        name="Comitium"
        purpose={attempt.request.purpose}
        domain={attempt.request.domain}
        scope={attempt.request.scope}
        mode={attempt.request.proofMode}
        oprfKeyId={attempt.request.oprfKeyId}
        uniqueIdentifierType={NullifierType.SALTED}
        theme={theme}
        query={buildQuery}
        onSuccess={handleSuccess}
        onError={onError}
        onReject={onReject}
      />
    </div>
  );
}

function readDocumentExpiry(result: QueryResult): string | null {
  const expiry = result.expiry_date?.disclose?.result;

  if (!expiry) {
    return null;
  }

  try {
    return formatInTimezone(expiry, 'UTC', 'yyyy-MM-dd');
  } catch {
    return null;
  }
}
