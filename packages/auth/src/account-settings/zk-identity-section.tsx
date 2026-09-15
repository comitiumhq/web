import { isDefined } from '@comitium/schemas/guards';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Spinner } from '@comitium/ui/spinner';
import { XIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NullifierType, type ProofResult, type QueryBuilder } from '@zkpassport/sdk';
import { ZKPassportQRCode } from '@zkpassport/ui/react';
import { useTheme } from 'next-themes';
import { type ReactNode, useCallback, useRef, useState } from 'react';

import type {
  CompleteZkIdentityAttemptInput,
  ZkIdentityApi,
  ZkIdentityAttempt,
  ZkIdentityStatus,
} from '../zk-identity';
import { ZkPassportMark } from './zkpassport-mark';

const FAILURE_MESSAGES = {
  proof_invalid: 'The proof did not satisfy this verification request.',
  identity_already_linked: 'This document has already been used to verify another Comitium account.',
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

  const completeAttempt = useMutation({
    mutationFn: ({ attemptId, input }: { attemptId: string; input: CompleteZkIdentityAttemptInput }) =>
      api.completeZkIdentityAttempt(attemptId, input),
    onSuccess: (status) => {
      setAttempt(null);

      if (status.status === 'verified') {
        queryClient.setQueryData(queryKey, status);
      }
    },
    onError: async () => {
      setAttempt(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const createAttempt = useMutation({
    mutationFn: api.createZkIdentityAttempt,
    onMutate: () => completeAttempt.reset(),
    onSuccess: setAttempt,
  });

  if (statusQuery.isPending) {
    return <ZkIdentityLoading />;
  }

  if (statusQuery.isError) {
    return (
      <ZkIdentityCard
        title="Verification unavailable"
        description="The verification status could not be loaded. Refresh the page to try again."
        status={<Badge variant="destructive">Unavailable</Badge>}
      />
    );
  }

  if (statusQuery.data.status === 'verified') {
    return <VerifiedIdentity status={statusQuery.data} />;
  }

  if (completeAttempt.data?.status === 'failed' && completeAttempt.data.failureCode === 'identity_already_linked') {
    return (
      <ZkIdentityCard
        title="Identity already verified"
        description="This ID is linked to another Comitium account. Sign in to that account or recover access."
      />
    );
  }

  let completionFailure: string | null = null;
  if (completeAttempt.data?.status === 'failed') {
    completionFailure = FAILURE_MESSAGES[completeAttempt.data.failureCode];
  } else if (completeAttempt.isError) {
    completionFailure = 'Could not finish verification. Try again when you are ready.';
  }
  const prompt = isDefined(completionFailure)
    ? {
        action: 'Try again',
        description: completionFailure,
        title: 'Verification failed',
      }
    : {
        action: 'Verify',
        description:
          'Verify your identity privately without sharing your personal information. Your document details stay on your device.',
        title: (
          <span className="flex items-center gap-2">
            <ZkPassportMark className="size-6 shrink-0" />
            <span>Verify with zkPassport</span>
          </span>
        ),
      };

  return (
    <>
      <StartIdentity
        title={prompt.title}
        description={prompt.description}
        action={prompt.action}
        isStarting={createAttempt.isPending}
        startFailed={createAttempt.isError}
        onStart={() => createAttempt.mutate()}
      />
      {isDefined(attempt) ? (
        <ZkPassportDialog
          key={attempt.attemptId}
          attempt={attempt}
          onClose={() => setAttempt(null)}
          onComplete={(input) => completeAttempt.mutate({ attemptId: attempt.attemptId, input })}
        />
      ) : null}
    </>
  );
}

function ZkPassportDialog({
  attempt,
  onClose,
  onComplete,
}: {
  attempt: ZkIdentityAttempt;
  onClose: () => void;
  onComplete: (input: CompleteZkIdentityAttemptInput) => void;
}) {
  const [open, setOpen] = useState(true);

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-1rem)] w-[380px] max-w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-[14px] bg-transparent p-0 ring-0 sm:max-w-[380px]"
        onCloseAutoFocus={onClose}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>ZKPassport verification</DialogTitle>
          <DialogDescription>Complete the verification request in the ZKPassport app.</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button className="absolute top-1.5 left-2 z-10" variant="ghost" size="icon-xs">
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
        <ZkPassportFlow attempt={attempt} onComplete={onComplete} />
      </DialogContent>
    </Dialog>
  );
}

function ZkPassportFlow({
  attempt,
  onComplete,
}: {
  attempt: ZkIdentityAttempt;
  onComplete: (input: CompleteZkIdentityAttemptInput) => void;
}) {
  const { resolvedTheme } = useTheme();
  const proofsByIndex = useRef(new Map<number, ProofResult>());
  const submitted = useRef(false);
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const buildQuery = useCallback(
    (builder: QueryBuilder) => builder.policy(attempt.request.policyId).bind('custom_data', attempt.challenge).done(),
    [attempt],
  );

  const submitProofs = useCallback(
    (proof: ProofResult) => {
      if (submitted.current) {
        return;
      }

      const proofs = collectCompleteProofSet(proofsByIndex.current, proof);

      if (!isDefined(proofs)) {
        return;
      }

      submitted.current = true;
      onComplete({
        challenge: attempt.challenge,
        proofs,
      });
    },
    [attempt.challenge, onComplete],
  );

  const resetProofs = useCallback(() => {
    if (!submitted.current) {
      proofsByIndex.current.clear();
    }
  }, []);

  return (
    <div className="flex min-w-0 justify-center">
      <ZKPassportQRCode
        name="Comitium"
        domain={attempt.request.domain}
        mode={attempt.request.proofMode}
        oprfKeyId={attempt.request.oprfKeyId}
        uniqueIdentifierType={NullifierType.SALTED}
        theme={theme}
        query={buildQuery}
        onProofGenerated={submitProofs}
        onRetryClicked={resetProofs}
      />
    </div>
  );
}

function collectCompleteProofSet(proofsByIndex: Map<number, ProofResult>, proof: ProofResult): ProofResult[] | null {
  const { index, total } = proof;

  if (!isDefined(index) || !isDefined(total) || index < 0 || total < 1 || index >= total) {
    return null;
  }

  proofsByIndex.set(index, proof);

  if (proofsByIndex.size !== total) {
    return null;
  }

  const proofs: ProofResult[] = [];

  for (let proofIndex = 0; proofIndex < total; proofIndex += 1) {
    const candidate = proofsByIndex.get(proofIndex);

    if (!isDefined(candidate) || candidate.total !== total) {
      return null;
    }

    proofs.push(candidate);
  }

  return proofs;
}

function StartIdentity({
  action,
  description,
  isStarting,
  onStart,
  startFailed,
  title,
}: {
  action: string;
  description: string;
  isStarting: boolean;
  onStart: () => void;
  startFailed: boolean;
  title: ReactNode;
}) {
  return (
    <ZkIdentityCard title={title} description={description}>
      <Button onClick={onStart} disabled={isStarting}>
        {isStarting ? <Spinner /> : null}
        {isStarting ? 'Preparing…' : action}
      </Button>
      {startFailed ? (
        <p role="alert" className="text-sm text-destructive-text">
          Could not create a verification request. Try again.
        </p>
      ) : null}
    </ZkIdentityCard>
  );
}

function VerifiedIdentity({ status }: { status: Extract<ZkIdentityStatus, { status: 'verified' }> }) {
  const verifiedDate = new Date(status.verifiedAt).toLocaleDateString();

  return (
    <ZkIdentityCard
      title="Verification complete"
      description={`Verified privately with ZKPassport on ${verifiedDate}.`}
      status={<Badge variant="success">Verified</Badge>}
    />
  );
}

function ZkIdentityLoading() {
  return (
    <Card size="sm" className="w-full max-w-3xl">
      <CardContent className="flex min-h-24 items-center justify-center">
        <Spinner />
      </CardContent>
    </Card>
  );
}

function ZkIdentityCard({
  children,
  description,
  status,
  title,
}: {
  children?: ReactNode;
  description: string;
  status?: ReactNode;
  title: ReactNode;
}) {
  return (
    <Card size="sm" className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="max-w-2xl leading-6">{description}</CardDescription>
        {isDefined(status) ? <CardAction>{status}</CardAction> : null}
      </CardHeader>
      {isDefined(children) ? <CardContent className="space-y-3">{children}</CardContent> : null}
    </Card>
  );
}
