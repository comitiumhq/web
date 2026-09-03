import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { qk } from '@/hooks/query-keys';
import { connectCalendar } from '@/lib/api/interviews';

export function useFinalizeCalendarConnect(orgId: string) {
  const queryClient = useQueryClient();
  const invalidateStatus = () => queryClient.invalidateQueries({ queryKey: qk.calendar.status(orgId) });

  return useMutation({
    mutationFn: () => connectCalendar(orgId),
    onSuccess: (result) => {
      invalidateStatus();
      toast.success(result.connected ? 'Calendar connected' : "Calendar didn't connect — try again");
    },
    onError: () => {
      invalidateStatus();
      toast.error("Calendar didn't connect — try again");
    },
  });
}
