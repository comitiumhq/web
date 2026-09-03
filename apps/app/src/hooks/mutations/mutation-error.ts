import { toast } from 'sonner';

export function showMutationError(error: Error) {
  toast.error(error.message);
}
