import { useActiveWallet } from '@comitium/auth/use-wallet';
import { usdcToUsd } from '@comitium/chain/job-economics';
import { formatUsdcAmount } from '@comitium/chain/usdc';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Form } from '@comitium/ui/form';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { withdrawJobFunds } from '@/lib/orgs/job-funds';
import { cn, formatUsd } from '@/lib/utils';

import { UsdcAmountField } from './job-funds-form';
import { parseUsdcAmountInput, type UsdcAmountFormData, usdcAmountFormSchema } from './usdc-amount';
import { useJobFundsTransaction } from './use-job-funds-transaction';

function getWithdrawSubmitLabel(isPending: boolean, amountUsdc: bigint | null) {
  if (isPending) {
    return 'Withdrawing...';
  }

  return amountUsdc !== null ? `Withdraw ${formatUsdcAmount(amountUsdc)}` : 'Withdraw';
}

interface WithdrawModalProps {
  onChainOrgId: number;
  availableBalance: bigint;
  availableUsd: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: (amount: bigint) => void;
  onRefresh: () => void;
}

export function WithdrawModal({
  onChainOrgId,
  availableBalance,
  availableUsd,
  open,
  onOpenChange,
  onConfirmed,
  onRefresh,
}: WithdrawModalProps) {
  const wallet = useActiveWallet();
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const { submit, isPending } = useJobFundsTransaction({
    action: 'withdraw',
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
  const afterWithdrawal = amountUsd === null ? null : Math.max(0, availableUsd - amountUsd);
  const canSubmit = !!wallet && amountUsdc !== null && amountUsdc <= availableBalance;

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

  const executeWithdraw = useCallback(
    (withdrawAmount: bigint, displayAmount: string) => {
      if (!wallet) {
        return;
      }

      submit(() => withdrawJobFunds({ wallet, onChainOrgId, amount: withdrawAmount }), withdrawAmount, displayAmount);
    },
    [onChainOrgId, submit, wallet],
  );

  const onSubmit = useCallback(
    (data: UsdcAmountFormData) => {
      const parsedAmount = parseUsdcAmountInput(data.amount);

      if (parsedAmount === null) {
        return;
      }

      if (parsedAmount > availableBalance) {
        return;
      }

      executeWithdraw(parsedAmount, formatUsdcAmount(parsedAmount));
    },
    [availableBalance, executeWithdraw],
  );

  const handleWithdrawAll = useCallback(() => {
    if (availableBalance === 0n) {
      return;
    }

    executeWithdraw(availableBalance, formatUsd(availableUsd));
  }, [availableBalance, availableUsd, executeWithdraw]);

  const submitLabel = getWithdrawSubmitLabel(isPending, amountUsdc);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onInteractOutside={handleInteractOutside} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Job Funds</DialogTitle>
          <DialogDescription className="sr-only">
            Enter the USDC amount to withdraw from your organization's job funds.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <UsdcAmountField control={form.control} disabled={isPending} />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleWithdrawAll}
                disabled={isPending || availableBalance === 0n}
              >
                Withdraw All
              </Button>
            </div>

            <div className="text-label-14 text-muted-foreground">
              <div className="flex justify-between py-2">
                <span>Available to withdraw</span>
                <strong className="text-foreground tabular-nums">{formatUsd(availableUsd)}</strong>
              </div>
              <div className="flex justify-between py-2">
                <span>After withdrawal</span>
                <strong
                  className={cn('tabular-nums', {
                    'text-foreground': amountUsd !== null,
                    'text-muted-foreground': amountUsd === null,
                  })}
                >
                  {afterWithdrawal !== null ? formatUsd(afterWithdrawal) : '—'}
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
