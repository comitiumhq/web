import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import { disconnectCalendar } from '@/lib/api/interviews';

export function useDisconnectCalendar(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => disconnectCalendar(orgId),
    onSuccess: () => {
      toast.success('Calendar disconnected');
      queryClient.invalidateQueries({ queryKey: qk.calendar.status(orgId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
