import { useMutation } from '@tanstack/react-query';

import { bookPublicScheduleSlot } from '@/lib/api/public-schedule';
import type { BookPublicScheduleBody } from '@/lib/schemas/public-schedule';

interface BookPublicScheduleSlotParams {
  token: string;
  body: BookPublicScheduleBody;
}

export function useBookPublicScheduleSlot() {
  return useMutation({
    mutationFn: ({ token, body }: BookPublicScheduleSlotParams) => bookPublicScheduleSlot(token, body),
  });
}
