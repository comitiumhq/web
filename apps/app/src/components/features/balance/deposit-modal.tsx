import { useActiveWallet } from '@comitium/auth/use-wallet';
import { usdcToUsd } from '@comitium/chain/job-economics';
import { formatUsdcAmount } from '@comitium/chain/usdc';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Form } from '@comitium/ui/form';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { memo, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Address } from 'viem';
import { useWalletBalance } from '@/hooks/queries/use-wallet-balance';
import { depositJobFunds } from '@/lib/orgs/job-funds';
import { cn, formatUsd, formatUsdWhole } from '@/lib/utils';

import { UsdcAmountField } from './job-funds-form';
import { parseUsdcAmountInput, type UsdcAmountFormData, usdcAmountFormSchema } from './usdc-amount';
import { useJobFundsTransaction } from './use-job-funds-transaction';

interface DepositModalProps {
  onChainOrgId: number;
  stakeToken: Address;
  availableBalance: bigint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (amount: bigint) => void;
  onRefresh: () => void;
}

const QUICK_AMOUNTS = [300, 500, 1000];

function getDepositSubmitLabel(isPending: boolean, amountUsdc: bigint | null) {
  if (isPending) {
    return 'Depositing...';
  }

  return amountUsdc !== null ? `Deposit ${formatUsdcAmount(amountUsdc)}` : 'Deposit';
}

export function DepositModal({
  onChainOrgId,
  stakeToken,
  availableBalance,
  open,
  onOpenChange,
  onConfirmed,
  onRefresh,
}: DepositModalProps) {
  const wallet = useActiveWallet();
  const { balance: walletBalance, balanceUsd: walletBalanceUsd } = useWalletBalance(stakeToken, open);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { submit, isPending } = useJobFundsTransaction({
    action: 'deposit',
    onConfirmed,
    onRefresh,
    onClose: close,
  });

  const form = useForm<UsdcAmountFormData>({
    resolver: zodResolver(usdcAmountFormSchema),
    mode: 'onChange',
    defaultValues: { amount: '' },
  });

  const amountStr = form.watch('amount');
  const amountUsdc = parseUsdcAmountInput(amountStr);
  const amountUsd = amountUsdc === null ? null : usdcToUsd(amountUsdc);
  const availableUsd = usdcToUsd(availableBalance);
  const afterDeposit = amountUsd === null ? null : availableUsd + amountUsd;
  const canSubmit = wallet !== null && amountUsdc !== null && walletBalance !== null && amountUsdc <= walletBalance;

  useEffect(() => {
    if (!open) {
      form.reset({ amount: '' });
    }
  }, [form, open]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!isPending) {
        onOpenChange(value);
      }
    },
    [isPending, onOpenChange],
  );

  const handleInteractOutside = useCallback(
    (event: Event) => {
      if (isPending) {
        event.preventDefault();
      }
    },
    [isPending],
  );

  const handleQuickAmount = useCallback(
    (qa: number) => {
      form.setValue('amount', String(qa), { shouldDirty: true, shouldValidate: true });
    },
    [form],
  );

  const executeDeposit = useCallback(
    (depositAmount: bigint, displayAmount: string) => {
      if (!wallet) {
        return;
      }

      submit(
        () => depositJobFunds({ wallet, stakeToken, onChainOrgId, amount: depositAmount }),
        depositAmount,
        displayAmount,
      );
    },
    [onChainOrgId, stakeToken, submit, wallet],
  );

  const onSubmit = useCallback(
    (data: UsdcAmountFormData) => {
      const parsedAmount = parseUsdcAmountInput(data.amount);

      if (parsedAmount === null || walletBalance === null || parsedAmount > walletBalance) {
        return;
      }

      executeDeposit(parsedAmount, formatUsdcAmount(parsedAmount));
    },
    [executeDeposit, walletBalance],
  );

  const submitLabel = getDepositSubmitLabel(isPending, amountUsdc);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onInteractOutside={handleInteractOutside} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Job Funds</DialogTitle>
          <DialogDescription className="sr-only">
            Enter the USDC amount to deposit into your organization's job funds.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <UsdcAmountField control={form.control} disabled={isPending} />

            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((qa) => (
                <QuickAmountButton key={qa} amount={qa} onClick={handleQuickAmount} disabled={isPending} />
              ))}
            </div>

            <div className="text-label-14 text-muted-foreground">
              <div className="flex justify-between py-2">
                <span>Your USDC balance</span>
                <strong className="text-foreground tabular-nums">
                  {walletBalanceUsd !== null ? formatUsd(walletBalanceUsd) : '—'}
                </strong>
              </div>
              <div className="flex justify-between py-2">
                <span>After deposit</span>
                <strong
                  className={cn('tabular-nums', {
                    'text-muted-foreground': amountUsd === null,
                    'text-success': amountUsd !== null,
                  })}
                >
                  {afterDeposit !== null ? formatUsd(afterDeposit) : '—'}
                </strong>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit || isPending}>
                {isPending && <Spinner data-icon="inline-start" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface QuickAmountButtonProps {
  amount: number;
  onClick: (amount: number) => void;
  disabled: boolean;
}

const QuickAmountButton = memo(function QuickAmountButton({ amount, onClick, disabled }: QuickAmountButtonProps) {
  const handleClick = useCallback(() => {
    onClick(amount);
  }, [amount, onClick]);

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={disabled}>
      {formatUsdWhole(amount)}
    </Button>
  );
});
