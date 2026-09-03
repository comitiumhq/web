import { useAccount } from '@comitium/auth/use-wallet';
import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageHeader } from '@comitium/ui/page-header';
import { Skeleton } from '@comitium/ui/skeleton';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useOrgBalance } from '@/hooks/queries/use-org-balance';
import { useOrgTreasury } from '@/hooks/queries/use-org-treasury';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useStakeToken } from '@/hooks/queries/use-stake-token';
import { qk } from '@/hooks/query-keys';
import type { OrgBalance as OrgBalanceValue } from '@/lib/orgs/core/balance';
import { addressesEqual, cn, formatUsd } from '@/lib/utils';

import { BalanceHistory } from './balance-history';
import { DepositModal } from './deposit-modal';
import { WithdrawModal } from './withdraw-modal';

interface OrgBalanceProps {
  org: MyOrg;
}

type JobFundsBalanceAction = 'deposit' | 'withdraw';

interface TreasuryActionsProps {
  isLoading: boolean;
  description: string | null;
  withdrawDisabled: boolean;
  depositDisabled: boolean;
  onWithdraw: () => void;
  onDeposit: () => void;
}

interface BalanceMetricProps {
  label: string;
  value: string;
  isLoading: boolean;
  isMuted?: boolean;
}

function applyConfirmedBalanceChange(
  balance: OrgBalanceValue,
  action: JobFundsBalanceAction,
  amount: bigint,
): OrgBalanceValue {
  const available = action === 'deposit' ? balance.available + amount : balance.available - amount;
  const confirmedAvailable = available < 0n ? 0n : available;

  return {
    operationalBalance: confirmedAvailable + balance.lockedInJobs,
    lockedInJobs: balance.lockedInJobs,
    available: confirmedAvailable,
  };
}

function getTreasuryDescription(treasuryError: string | null, isTreasuryWallet: boolean) {
  if (treasuryError) {
    return 'Could not verify the treasury wallet. Try again in a moment.';
  }

  if (isTreasuryWallet) {
    return null;
  }

  return 'Connect the treasury wallet to deposit or withdraw funds.';
}

function BalanceMetric({ label, value, isLoading, isMuted = false }: BalanceMetricProps) {
  return (
    <div className="w-24">
      <p className="text-label-14 text-muted-foreground">{label}</p>
      <div className="mt-1 flex h-7 items-center">
        {isLoading ? (
          <Skeleton className="h-6 w-20 rounded" />
        ) : (
          <p className={cn('text-heading-20 tabular-nums', { 'text-muted-foreground': isMuted })}>{value}</p>
        )}
      </div>
    </div>
  );
}

function TreasuryActions({
  isLoading,
  description,
  withdrawDisabled,
  depositDisabled,
  onWithdraw,
  onDeposit,
}: TreasuryActionsProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-9 w-full items-center sm:w-56 sm:justify-end">
        <Skeleton className="h-9 w-44 rounded-full" />
      </div>
    );
  }

  if (description) {
    return (
      <div className="flex min-h-9 w-full items-center sm:w-56 sm:justify-end">
        <p className="text-copy-13 text-muted-foreground sm:text-right">{description}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-9 w-full flex-wrap items-center gap-2 sm:w-56 sm:justify-end">
      <Button variant="outline" onClick={onWithdraw} disabled={withdrawDisabled}>
        Withdraw
      </Button>
      <Button onClick={onDeposit} disabled={depositDisabled}>
        Deposit
      </Button>
    </div>
  );
}

export function OrgBalance({ org }: OrgBalanceProps) {
  const queryClient = useQueryClient();
  const { address, wallet } = useAccount();
  const { balance, availableUsd, lockedUsd, isLoading, error } = useOrgBalance(org.orgId);
  const { treasury, isLoading: isTreasuryLoading, error: treasuryError } = useOrgTreasury(org.id);
  const { data: stakeToken, isLoading: isStakeTokenLoading, error: stakeTokenError } = useStakeToken();
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const currentTreasury = treasury?.currentTreasury ?? null;
  const isTreasuryWallet = !!address && !!currentTreasury && addressesEqual(address, currentTreasury);
  const actionsDisabled = isLoading || isTreasuryLoading || !!treasuryError || !isTreasuryWallet;
  const withdrawDisabled = actionsDisabled || !balance || balance.available === 0n;
  const depositDisabled = actionsDisabled || isStakeTokenLoading || !!stakeTokenError || !stakeToken;
  const treasuryDescription = getTreasuryDescription(treasuryError, isTreasuryWallet);

  const refreshFunds = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.balance.org(org.orgId), exact: true });
    queryClient.invalidateQueries({ queryKey: qk.balance.orgHistory(org.id), exact: true });
    queryClient.invalidateQueries({ queryKey: qk.balance.walletRoot() });
  }, [queryClient, org.id, org.orgId]);

  const applyConfirmedFundsChange = useCallback(
    (action: JobFundsBalanceAction, amount: bigint) => {
      queryClient.setQueryData<OrgBalanceValue>(qk.balance.org(org.orgId), (currentBalance) => {
        if (!currentBalance) {
          return currentBalance;
        }

        return applyConfirmedBalanceChange(currentBalance, action, amount);
      });

      queryClient.invalidateQueries({ queryKey: qk.balance.orgHistory(org.id), exact: true });
      queryClient.invalidateQueries({ queryKey: qk.balance.walletRoot() });
    },
    [queryClient, org.id, org.orgId],
  );

  const handleDepositConfirmed = useCallback(
    (amount: bigint) => applyConfirmedFundsChange('deposit', amount),
    [applyConfirmedFundsChange],
  );

  const handleWithdrawConfirmed = useCallback(
    (amount: bigint) => applyConfirmedFundsChange('withdraw', amount),
    [applyConfirmedFundsChange],
  );

  const handleOpenWithdraw = useCallback(() => setWithdrawOpen(true), []);
  const handleOpenDeposit = useCallback(() => setDepositOpen(true), []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4 sm:px-6 pb-8">
        <EmptyState
          icon={WarningCircleIcon}
          title="Something went wrong"
          description="We couldn't load your balance. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-8">
      <PageHeader title="Job Funds" />

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div>
          <Card size="sm" className="ring-inset">
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="flex items-baseline gap-6">
                  <BalanceMetric label="Available" value={formatUsd(availableUsd)} isLoading={isLoading} />
                  <BalanceMetric label="Committed" value={formatUsd(lockedUsd)} isLoading={isLoading} isMuted />
                </div>

                <TreasuryActions
                  isLoading={isTreasuryLoading}
                  description={treasuryDescription}
                  withdrawDisabled={withdrawDisabled}
                  depositDisabled={depositDisabled}
                  onWithdraw={handleOpenWithdraw}
                  onDeposit={handleOpenDeposit}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-h-0 flex-1">
          <BalanceHistory orgId={org.id} />
        </div>
      </div>

      {wallet && stakeToken && isTreasuryWallet && (
        <DepositModal
          onChainOrgId={org.orgId}
          stakeToken={stakeToken}
          availableBalance={balance?.available ?? 0n}
          open={depositOpen}
          onOpenChange={setDepositOpen}
          onConfirmed={handleDepositConfirmed}
          onRefresh={refreshFunds}
        />
      )}
      {wallet && isTreasuryWallet && (
        <WithdrawModal
          onChainOrgId={org.orgId}
          availableBalance={balance?.available ?? 0n}
          availableUsd={availableUsd}
          open={withdrawOpen}
          onOpenChange={setWithdrawOpen}
          onConfirmed={handleWithdrawConfirmed}
          onRefresh={refreshFunds}
        />
      )}
    </div>
  );
}
