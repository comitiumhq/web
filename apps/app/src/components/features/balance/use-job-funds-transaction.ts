import { isProductSubmissionUncertain } from '@comitium/auth/send-calls';
import type { TransactionError } from '@comitium/schemas/product-errors';
import { getProductErrorMessage } from '@comitium/ui/product-error-messages';
import type { ResultAsync } from 'neverthrow';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

type JobFundsOperation = () => ResultAsync<unknown, TransactionError>;

const UNCERTAIN_SUBMISSION_REFRESH_DELAY_MS = 5_000;
const TRANSACTION_COPY = {
  deposit: {
    pending: 'Depositing job funds...',
    delayed: 'Deposit is taking longer than expected. Check your balance in a moment.',
    fallbackError: 'Deposit could not be confirmed. Please try again.',
    success: (displayAmount: string) => `Deposit of ${displayAmount} confirmed`,
  },
  withdraw: {
    pending: 'Withdrawing job funds...',
    delayed: 'Withdrawal is taking longer than expected. Check your balance in a moment.',
    fallbackError: 'Withdrawal could not be confirmed. Please try again.',
    success: (displayAmount: string) => `Withdrawal of ${displayAmount} confirmed`,
  },
} as const;

type JobFundsAction = keyof typeof TRANSACTION_COPY;

interface UseJobFundsTransactionParams {
  action: JobFundsAction;
  onConfirmed: (amount: bigint) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function useJobFundsTransaction({ action, onConfirmed, onRefresh, onClose }: UseJobFundsTransactionParams) {
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (operation: JobFundsOperation, amount: bigint, displayAmount: string) => {
      const copy = TRANSACTION_COPY[action];
      const toastId = toast.loading(copy.pending);
      setIsPending(true);

      const result = await operation();
      setIsPending(false);

      if (result.isErr()) {
        if (isProductSubmissionUncertain(result.error)) {
          setTimeout(onRefresh, UNCERTAIN_SUBMISSION_REFRESH_DELAY_MS);
          toast.info(copy.delayed, { id: toastId });

          return;
        }

        toast.error(getProductErrorMessage(result.error, copy.fallbackError), { id: toastId });

        return;
      }

      onConfirmed(amount);
      toast.success(copy.success(displayAmount), { id: toastId });
      onClose();
    },
    [action, onClose, onConfirmed, onRefresh],
  );

  return {
    submit,
    isPending,
  };
}
