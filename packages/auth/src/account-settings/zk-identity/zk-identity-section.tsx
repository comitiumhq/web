import type { ZkIdentityApi } from '../../zk-identity';
import { useZkIdentity } from './use-zk-identity';
import { ZkIdentityCard, ZkIdentityLoading, ZkIdentityUnavailable } from './zk-identity-card';
import { ZkPassportDialog } from './zkpassport-dialog';

export function ZkIdentitySection({ api, queryKey }: { api: ZkIdentityApi; queryKey: readonly unknown[] }) {
  const verification = useZkIdentity(api, queryKey);
  const { attempt, statusQuery } = verification;

  if (statusQuery.isPending) {
    return <ZkIdentityLoading />;
  }

  if (statusQuery.isError) {
    return <ZkIdentityUnavailable />;
  }

  return (
    <>
      <ZkIdentityCard
        status={statusQuery.data}
        failureCode={verification.failureCode}
        isStarting={verification.isStarting}
        onStart={verification.start}
      />
      {attempt ? (
        <ZkPassportDialog
          key={attempt.attemptId}
          attempt={attempt}
          onClose={verification.close}
          onComplete={(input) => verification.complete(attempt.attemptId, input)}
          onError={verification.handleError}
          onReject={verification.handleReject}
        />
      ) : null}
    </>
  );
}
