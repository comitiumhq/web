import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { Spinner } from '@comitium/ui/spinner';
import { CheckCircleIcon, ShieldCheckIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, type ReactNode } from 'react';

import type {
  CompleteZkIdentityAttemptInput,
  ZkIdentityApi,
  ZkIdentityAttempt,
  ZkIdentityStatus,
} from '../zk-identity';
import { useZkPassportRequest } from './use-zkpassport-request';

type IdentityVerificationMode = 'unknown' | 'live' | 'mock';

const PRIVACY_EXPLANATIONS: Record<IdentityVerificationMode, string> = {
  unknown:
    'Live ZK Identity uses zero-knowledge cryptography to prove that you are 18+, match the photo on a supported ID, and have not used the same ID for another Comitium account—without revealing who you are.',
  live: 'ZK Identity uses zero-knowledge cryptography to prove that you are 18+, match the photo on a supported ID, and have not used the same ID for another Comitium account—without revealing who you are.',
  mock: 'Development mode uses mock data to test the integration. It does not verify a real person.',
};

const PRIVACY_STORAGE_EXPLANATION =
  'Your identity document and personal details never leave your phone and are never stored by Comitium.';

const FAILURE_MESSAGES = {
  proof_invalid: 'The submitted proofs did not satisfy the ZK Identity request.',
  identity_already_linked: 'This identity is already connected to another Comitium account.',
  verifier_unavailable: 'The verifier was temporarily unavailable. Start again when you are ready.',
} as const;

export function ZkIdentitySection({ api, queryKey }: { api: ZkIdentityApi; queryKey: readonly unknown[] }) {
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState<ZkIdentityAttempt | null>(null);

  const statusQuery = useQuery({
    queryKey,
    queryFn: api.getZkIdentityStatus,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const createAttempt = useMutation({
    mutationFn: api.createZkIdentityAttempt,
    onSuccess: (created) => {
      setAttempt(created);
      queryClient.setQueryData<ZkIdentityStatus>(queryKey, {
        status: 'pending',
        expiresAt: created.expiresAt,
      });
    },
  });

  const completeAttempt = useMutation({
    mutationFn: ({ attemptId, input }: { attemptId: string; input: CompleteZkIdentityAttemptInput }) =>
      api.completeZkIdentityAttempt(attemptId, input),
    onSuccess: (status) => {
      setAttempt(null);
      queryClient.setQueryData(queryKey, status);
    },
    onError: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const submitAttempt = completeAttempt.mutateAsync;

  const submitProof = useCallback(
    (input: CompleteZkIdentityAttemptInput) => {
      if (!attempt) {
        throw new Error('ZK identity attempt is no longer active');
      }

      return submitAttempt({ attemptId: attempt.attemptId, input });
    },
    [attempt, submitAttempt],
  );

  if (statusQuery.isPending) {
    return <ZkIdentityLoading />;
  }

  if (statusQuery.isError) {
    return (
      <ZkIdentityCard>
        <Alert variant="destructive">
          <WarningCircleIcon />
          <AlertTitle>Could not load ZK Identity</AlertTitle>
          <AlertDescription>Try loading the account page again.</AlertDescription>
        </Alert>
      </ZkIdentityCard>
    );
  }

  if (statusQuery.data.status === 'verified') {
    return <VerifiedIdentity status={statusQuery.data} />;
  }

  if (attempt) {
    return (
      <ZkIdentityCard>
        <ZkPassportFlow
          attempt={attempt}
          isRestarting={createAttempt.isPending}
          onComplete={submitProof}
          onRestart={() => createAttempt.mutate()}
          restartFailed={createAttempt.isError}
        />
      </ZkIdentityCard>
    );
  }

  return (
    <ZkIdentityCard>
      <div className="space-y-5">
        <IdentityPrivacySummary verificationMode="unknown" />
        {statusQuery.data.status === 'failed' ? <FailedIdentity status={statusQuery.data} /> : null}
        {statusQuery.data.status === 'pending' ? (
          <Alert variant="info">
            <AlertTitle>Verification in progress</AlertTitle>
            <AlertDescription>
              This browser no longer has the private verification session. Start again to replace it.
            </AlertDescription>
          </Alert>
        ) : null}
        <Button onClick={() => createAttempt.mutate()} disabled={createAttempt.isPending}>
          {createAttempt.isPending ? <Spinner /> : <ShieldCheckIcon />}
          Verify with zkPassport
        </Button>
        {createAttempt.isError ? (
          <p role="alert" className="text-sm text-destructive-text">
            Could not start verification. Please try again.
          </p>
        ) : null}
      </div>
    </ZkIdentityCard>
  );
}

function ZkPassportFlow({
  attempt,
  isRestarting,
  onComplete,
  onRestart,
  restartFailed,
}: {
  attempt: ZkIdentityAttempt;
  isRestarting: boolean;
  onComplete: (input: CompleteZkIdentityAttemptInput) => Promise<ZkIdentityStatus>;
  onRestart: () => void;
  restartFailed: boolean;
}) {
  const flow = useZkPassportRequest(attempt, onComplete);

  if (flow.stage === 'waiting') {
    return (
      <div className="space-y-5">
        <IdentityPrivacySummary verificationMode={attempt.request.devMode ? 'mock' : 'live'} />
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
          <img
            src={flow.qrCode}
            alt="QR code to continue ZK Identity verification in the zkPassport app"
            className="size-[min(17.5rem,100%)] rounded-lg bg-white p-2"
          />
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Scan with the zkPassport mobile app, or open the request on this device.
          </p>
          <Button asChild variant="outline">
            <a href={flow.url} target="_blank" rel="noreferrer">
              Open zkPassport
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (flow.stage === 'error' || flow.stage === 'rejected') {
    return (
      <div className="space-y-4">
        <Alert variant={flow.stage === 'error' ? 'destructive' : 'default'}>
          <AlertTitle>{flow.stage === 'error' ? 'Verification could not finish' : 'Verification declined'}</AlertTitle>
          <AlertDescription>
            {flow.stage === 'error'
              ? 'No ZK Identity status was granted. You can safely start again.'
              : 'No verification result was submitted to Comitium. You can return later or start again now.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onRestart} disabled={isRestarting}>
          {isRestarting ? <Spinner /> : null}
          {isRestarting ? 'Starting…' : 'Start again'}
        </Button>
        {restartFailed ? (
          <p role="alert" className="text-sm text-destructive-text">
            Could not start a new verification. Please try again.
          </p>
        ) : null}
      </div>
    );
  }

  const progressLabel = {
    preparing: 'Preparing a private verification request…',
    scanned: 'Request opened in zkPassport…',
    generating: 'Generating privacy-preserving proofs…',
    submitting: 'Confirming proofs with the verifier…',
  }[flow.stage];

  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
      <Spinner className="size-5" />
      <p className="text-sm text-muted-foreground">{progressLabel}</p>
    </div>
  );
}

function IdentityPrivacySummary({ verificationMode }: { verificationMode: IdentityVerificationMode }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info">18+</Badge>
        <Badge variant="info">Private face match</Badge>
        {verificationMode === 'live' ? <Badge variant="info">One ID per account</Badge> : null}
        {verificationMode === 'mock' ? <Badge variant="warning">Development mode</Badge> : null}
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>{PRIVACY_EXPLANATIONS[verificationMode]}</p>
        <p>{PRIVACY_STORAGE_EXPLANATION}</p>
      </div>
    </div>
  );
}

function VerifiedIdentity({ status }: { status: Extract<ZkIdentityStatus, { status: 'verified' }> }) {
  if (status.verificationMode === 'mock') {
    return (
      <ZkIdentityCard>
        <Alert variant="info">
          <WarningCircleIcon />
          <AlertTitle>ZK Identity verified in development mode</AlertTitle>
          <AlertDescription>
            The development flow completed on{' '}
            <time dateTime={status.verifiedAt}>{new Date(status.verifiedAt).toLocaleDateString()}</time> using mock
            data. This does not verify a real person and cannot be treated as a production verification.
          </AlertDescription>
        </Alert>
      </ZkIdentityCard>
    );
  }

  return (
    <ZkIdentityCard>
      <Alert variant="success">
        <CheckCircleIcon />
        <AlertTitle>ZK Identity verified</AlertTitle>
        <AlertDescription>
          Verified with zero-knowledge proofs on{' '}
          <time dateTime={status.verifiedAt}>{new Date(status.verifiedAt).toLocaleDateString()}</time>: age 18+, private
          face match, and one ID per account—without revealing or storing your personal details.
        </AlertDescription>
      </Alert>
    </ZkIdentityCard>
  );
}

function FailedIdentity({ status }: { status: Extract<ZkIdentityStatus, { status: 'failed' }> }) {
  return (
    <Alert variant="destructive">
      <WarningCircleIcon />
      <AlertTitle>ZK Identity not verified</AlertTitle>
      <AlertDescription>{FAILURE_MESSAGES[status.failureCode]}</AlertDescription>
    </Alert>
  );
}

function ZkIdentityLoading() {
  return (
    <ZkIdentityCard>
      <div className="flex min-h-32 items-center justify-center">
        <Spinner />
      </div>
    </ZkIdentityCard>
  );
}

function ZkIdentityCard({ children }: { children: ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Identity verification</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
