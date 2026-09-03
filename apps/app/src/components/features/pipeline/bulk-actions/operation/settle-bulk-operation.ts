import { toast } from 'sonner';
import type { BulkOperation } from '@/lib/schemas/bulk-operations';
import { getSucceededApplicationIds } from '../model';

interface SettleBulkOperationOptions {
  operation: BulkOperation;
  successMessage: string;
  onCompleted: (applicationIds: readonly string[]) => void;
  onOpenChange: (open: boolean) => void;
}

export function settleBulkOperation({
  operation,
  successMessage,
  onCompleted,
  onOpenChange,
}: SettleBulkOperationOptions) {
  onCompleted(getSucceededApplicationIds(operation));

  if (operation.status !== 'completed') return;

  toast.success(successMessage);
  onOpenChange(false);
}
